<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /modules/problem.php                                                                   |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    
    $problemList = Array();
    foreach(glob(PROBLEMS_DIR ."/*", GLOB_ONLYDIR) as $i => $path)
        $problemList[basename($path)] = json_decode((new fip($path ."/data.json")) -> read(), true);

    define("PROBLEM_TEMPLATE", Array(
        "name" => "Sample Problem",
        "point" => 0,
        "time" => Array(
            "begin" => 0,
            "during" => 0,
            "offset" => 0
        ),
        "results" => Array(),
        "thumbnail" => null,
        "attachment" => null
    ));

    // Return Code
    define("PROBLEM_OKAY", 0);
    define("PROBLEM_ERROR", 1);
    define("PROBLEM_ERROR_IDREJECT", 2);
    define("PROBLEM_ERROR_FILETOOLARGE", 3);
    define("PROBLEM_ERROR_FILEREJECT", 4);
    define("PROBLEM_ERROR_FILENOTFOUND", 5);
    define("PROBLEM_ERROR_DISABLED", 6);
    define("PROBLEM_ERROR_NOT_SUBMITTED", 7);

    function problemEdit(String $id, Array $set, Array $thumbnail = null, Array $attachment = null) {
		global $problemList;

		if (!problemExist($id))
			return PROBLEM_ERROR_IDREJECT;

		$defTemplate = PROBLEM_TEMPLATE;

		// Add image and attachment value if current data have
		// it because the template does not have the image and
		// attachment field
		if (isset($problemList[$id]["thumbnail"]))
			$defTemplate["thumbnail"] = $problemList[$id]["thumbnail"];

		if (isset($problemList[$id]["attachment"]))
			$defTemplate["attachment"] = $problemList[$id]["attachment"];

		if (isset($thumbnail)) {
			$thumbnailFile = utf8_encode(strtolower($thumbnail["name"]));
			$extension = pathinfo($thumbnailFile, PATHINFO_EXTENSION);

			if (!in_array($extension, IMAGE_ALLOW))
				return PROBLEM_ERROR_FILEREJECT;

			if ($thumbnail["size"] > MAX_IMAGE_SIZE)
				return PROBLEM_ERROR_FILETOOLARGE;

			if ($thumbnail["error"] > 0)
				return PROBLEM_ERROR;

			if (isset($problemList[$id]["thumbnail"]) && file_exists(PROBLEMS_DIR ."/". $id ."/". $problemList[$id]["thumbnail"]))
				unlink(PROBLEMS_DIR ."/". $id ."/". $problemList[$id]["thumbnail"]);

			move_uploaded_file($thumbnail["tmp_name"], PROBLEMS_DIR ."/". $id ."/". $thumbnailFile);

			$set["thumbnail"] = $thumbnailFile;
		}

		if (isset($attachment)) {
			$attachmentFile = utf8_encode(strtolower($attachment["name"]));
			$extension = pathinfo($attachmentFile, PATHINFO_EXTENSION);

			if ($attachment["size"] > MAX_ATTACHMENT_SIZE)
				return PROBLEM_ERROR_FILETOOLARGE;

			if ($attachment["error"] > 0)
				return PROBLEM_ERROR;

			if (isset($problemList[$id]["attachment"]) && file_exists(PROBLEMS_DIR ."/". $id ."/". $problemList[$id]["attachment"]))
				unlink(PROBLEMS_DIR ."/". $id ."/". $problemList[$id]["attachment"]);

			move_uploaded_file($attachment["tmp_name"], PROBLEMS_DIR ."/". $id ."/". $attachmentFile);

			$set["attachment"] = $attachmentFile;
		}

		// Merge current data into the template, then merge changes into
		// the template.
		// This is to automaticly update problem config to the template
		mergeObjectRecursive($defTemplate, $problemList[$id], false, true);
		mergeObjectRecursive($defTemplate, $set, function($a, $b, $k) {
			if ($a !== "NULL" && $a !== $b)
				stop(3, "Loại biến không khớp! Yêu cầu $k là \"$a\", nhận được \"$b\"!", 400, Array(
					"expect" => $a,
					"got" => $b,
					"key" => $k
				));
	
			return true;
		}, true);

		$problemList[$id] = $defTemplate;
		problemSave($id);

		return PROBLEM_OKAY;
	}

	function problemAdd(String $id, Array $add, Array $thumbnail = null, Array $attachment = null) {
		global $problemList;

		if (problemExist($id))
			return PROBLEM_ERROR_IDREJECT;
		
		$problemList[$id] = PROBLEM_TEMPLATE;
		mergeObjectRecursive($problemList[$id], $add, function($a, $b, $k) {
			if ($a !== "NULL" && $a !== $b)
				stop(3, "Loại biến không khớp! Yêu cầu $k là \"$a\", nhận được \"$b\"!", 400, Array(
					"expect" => $a,
					"got" => $b,
					"key" => $k
				));
	
			return true;
		}, true);

		mkdir(PROBLEMS_DIR. "/" .$id, 0777, true);

		if (isset($thumbnail)) {
			$thumbnailFile = utf8_encode(strtolower($thumbnail["name"]));
			$extension = pathinfo($thumbnailFile, PATHINFO_EXTENSION);

			if (!in_array($extension, IMAGE_ALLOW))
				return PROBLEM_ERROR_FILEREJECT;

			if ($thumbnail["size"] > MAX_IMAGE_SIZE)
				return PROBLEM_ERROR_FILETOOLARGE;

			if ($thumbnail["error"] > 0)
				return PROBLEM_ERROR;

			move_uploaded_file($thumbnail["tmp_name"], PROBLEMS_DIR ."/". $id ."/". $thumbnailFile);
			$problemList[$id]["thumbnail"] = $thumbnailFile;
		}

		if (isset($attachment)) {
			$attachmentFile = utf8_encode(strtolower($attachment["name"]));

			if ($attachment["size"] > MAX_ATTACHMENT_SIZE)
				return PROBLEM_ERROR_FILETOOLARGE;

			if ($attachment["error"] > 0)
				return PROBLEM_ERROR;

			move_uploaded_file($attachment["tmp_name"], PROBLEMS_DIR ."/". $id ."/". $attachmentFile);
			$problemList[$id]["attachment"] = $attachmentFile;
		}

		problemSave($id);
		return PROBLEM_OKAY;
	}

    function problemSave(String $id) {
        global $problemList;
        return (new fip(PROBLEMS_DIR ."/". $id ."/data.json"))
            -> write(json_encode($problemList[$id], JSON_PRETTY_PRINT));
    }

    function problemRemoveFile(String $type, String $id) {
        global $problemList;

        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        if (!isset($problemList[$id][$type]))
            return PROBLEM_ERROR_FILENOTFOUND;

        $file = $problemList[$id][$type];
        $dir = PROBLEMS_DIR ."/". $id;
        $target = $dir ."/". $file;
        
        if (file_exists($target))
            unlink($target);

        unset($problemList[$id][$type]);
        problemSave($id);

        return PROBLEM_OKAY;
    }

    function problemList() {
        global $problemList;
        $list = Array();
        
        foreach($problemList as $i => $item)
            array_push($list, Array(
                "id" => $i,
                "name" => $item["name"],
                "point" => $item["point"],
                "time" => $item["time"],
                "thumbnail" => "/api/problems/thumbnail?id=". $i,
                "attachment" => isset($item["attachment"])
                    ? $item["attachment"]
                    : null
            ));
        
        return $list;
    }

    function problemGet(String &$id) {
        global $problemList;

        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        $data = $problemList[$id];
        $data["id"] = $id;
        return $data;
    }

    function problemExist(String &$filename) {
        global $problemList;

        // TRY LIST
        $try = Array(
            $filename,
            strtoupper($filename),
            strtolower($filename)
        );

        foreach ($try as $value)
            if (isset($problemList[$value])) {
                $filename = $value;
                return true;
            }
        
        return false;
    }

    function problemGetAttachment(String $id, Bool $downloadHeader = true) {
        global $problemList;

        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        if (!isset($problemList[$id]["attachment"]))
            return PROBLEM_ERROR;
        
        $i = $problemList[$id]["attachment"];
        $f = PROBLEMS_DIR ."/". $id ."/". $i;

        contentType(pathinfo($i, PATHINFO_EXTENSION));
        header("Content-Length: ".filesize($f));

        if ($downloadHeader)
            header("Content-disposition: attachment; filename=". utf8_decode(pathinfo($i, PATHINFO_BASENAME))); 
        
        readfile($f);
        return PROBLEM_OKAY;
    }

    function problemRemove(String $id) {
        global $problemList;

        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        $dir = PROBLEMS_DIR ."/". $id;

        if (!file_exists(PROBLEMS_DIR ."/". $id))
            return PROBLEM_ERROR;

        rmrf(PROBLEMS_DIR ."/". $id);
        unset($problemList[$id]);
        return PROBLEM_OKAY;
    }

    function problemSubmit(String $id, String $username, Array $data) {
        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        (new fip(PROBLEMS_DIR ."/$id/$username.submit", "a:0:{}")) -> write(serialize($data));
        return PROBLEM_OKAY;
    }

    function problemSubmitted(String $id, String $username) {
        return (problemExist($id) && file_exists(PROBLEMS_DIR ."/$id/$username.submit"));
    }

    function problemGetSubmit(String $id, String $username) {
        if (!problemSubmitted($id, $username))
            return PROBLEM_ERROR_NOT_SUBMITTED;

        return unserialize((new fip(PROBLEMS_DIR ."/$id/$username.submit", "a:0:{}")) -> read());
    }

    function problemJudge(String $id, String $username) {
        if (!problemExist($id))
            return PROBLEM_ERROR_IDREJECT;

        $problem = problemGet($id);
        $file = PROBLEMS_DIR ."/$id/$username.submit";
        $data = unserialize((new fip($file, "a:0:{}")) -> read());
        $time = filemtime($file);

        $result = Array(
            "id" => $id,
            "username" => $username,
            "total" => 0,
            "correct" => 0,
            "wrong" => 0,
            "skipped" => 0,
            "point" => 0,
            "time" => $time,
            "detail" => Array()
        );

        foreach ($problem["results"] as $i => $value) {
            $template = Array(
                "status" => "",
                "result" => $value,
                "answer" => null
            );

            $result["total"]++;

            if (!isset($data[$i]) || $data[$i] === "") {
                $result["skipped"]++;
                $template["status"] = "skipped";

                $result["detail"][$i] = $template;
                continue;
            }

            $template["answer"] = $data[$i];

            if ($data[$i] !== $value) {
                $result["wrong"]++;
                $template["status"] = "wrong";

                $result["detail"][$i] = $template;
                continue;
            }

            $result["correct"]++;
            $template["status"] = "correct";

            $result["detail"][$i] = $template;
        }

        $result["point"] = ($result["correct"] / $result["total"]) * $problem["point"];

        (new fip(PROBLEMS_DIR ."/$id/$username.result", "a:0:{}")) -> write(serialize($result));
        return PROBLEM_OKAY;
    }

    function problemJudged(String $id, String $username) {
        return file_exists(PROBLEMS_DIR ."/$id/$username.result");
    }

    define("PROBLEM_NO_RESULT", 4);

    function problemGetResult(String $id, String $username) {
        if (!problemJudged($id, $username))
            return PROBLEM_NO_RESULT;

        return unserialize((new fip(PROBLEMS_DIR ."/$id/$username.result")) -> read());
    }

    define("CONTEST_STARTED", 1);
	define("CONTEST_NOTENDED", 2);
	define("CONTEST_ENDED", 3);

	function problemTimeRequire(String $id, Array $req = Array(
		CONTEST_STARTED,
		CONTEST_NOTENDED
	), $justReturn = true, $instantDeath = false, $resCode = 403) {
        global $problemList;

        if (!problemExist($id))
            return false;
        
        $problem = problemGet($id);
        $duringTime = $problem["time"]["during"];
        
		if ($duringTime <= 0)
			return true;

        $duringTime *= 60;

		// Admin can bypass this check
		if ($_SESSION["username"] !== null && $_SESSION["id"] === "admin")
			return true;

		$beginTime = $problem["time"]["begin"];
		$offsetTime = $problem["time"]["offset"];
		$t = $beginTime - microtime(true) + ($duringTime);

		foreach ($req as $key => $value) {
			$returnCode = null;
			$message = null;

			switch($value) {
				case CONTEST_STARTED:
					if ($t > $duringTime) {
						$returnCode = 103;
						$message = "Kì thi \"$id\" chưa bắt đầu";
					}
					break;

				case CONTEST_NOTENDED:
					if ($t < -$offsetTime && $duringTime !== 0) {
						$returnCode = 104;
						$message = "Kì thi \"$id\" đã kết thúc";
					}
					break;

				case CONTEST_ENDED:
					if ($t > -$offsetTime && $duringTime !== 0) {
						$returnCode = 105;
						$message = "Kì thi \"$id\" chưa kết thúc";
					}
					break;

				default:
					trigger_error("Unknown case: ". $value, E_USER_ERROR);
					break;
			}

			if ($returnCode !== null && $message !== null) {
				if ($justReturn === true)
					return $returnCode;

				//* Got NOTICE on Codefactor for no reason:
				//* if ($useDie === true)
				//* 	(http_response_code($resCode) && die());

				if ($instantDeath === true) {
					http_response_code($resCode);
					die();
                }

				stop($returnCode, $message, $resCode);
			}
		}

		return true;
	}