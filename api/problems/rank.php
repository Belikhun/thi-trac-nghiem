<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/problems/list.php                                                                       |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php"; 
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/problems/problem.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/xmldb/account.php";

	$id = getQuery("id");
	$res = Array();
	$_list_ = Array();
	$list = Array();
	$nameList = Array();
	$total = Array();
	$overall = 0;

	if ($id) {
		if (!problemExist($id))
			stop(44, "Không tìm thấy để của id đã cho!", 404, Array( "id" => $id ));

		problemTimeRequire($id, [CONTEST_ENDED], false);
		$resultList = glob(PROBLEM_DIR ."/$id/*.result");

		foreach ($resultList as $file) {
			$data = unserialize((new fip($file, "a:0:{}")) -> read());
			$user = $data["username"];

			if (!isset($res[$user])) {
				$userData = getUserData($user);
				$res[$user] = $data;

				$res[$user]["name"] = ($userData && isset($userData["name"])) ? $userData["name"] : null;
			}

			foreach ($data["detail"] as $key => $value) {
				$_list_[$key] = null;
				$nameList[$key] = "Câu ". ($key + 1);
			}
		}

		foreach ($_list_ as $key => $value)
			array_push($list, $key);

		// Sort data by point
		usort($res, function($a, $b) {
			$a = $a["point"];
			$b = $b["point"];
		
			if ($a === $b)
				return 0;

			return ($a > $b) ? -1 : 1;
		});

		foreach ($res as $value) {
			$total[$value["username"]] = $value["point"];
			$overall += $total[$value["username"]];
		}
	} else {
		$resultList = glob(PROBLEM_DIR ."/*/*.result", GLOB_BRACE);

		foreach ($resultList as $file) {
			$data = unserialize((new fip($file, "a:0:{}")) -> read());

			if (problemTimeRequire($data["id"], [CONTEST_ENDED], true) !== true)
				continue;

			$user = $data["username"];
			$problem = problemGet($data["id"]);

			if (!isset($res[$user])) {
				$userData = getUserData($user);

				$res[$user] = Array(
					"username" => $user,
					"name" => ($userData && isset($userData["name"])) ? $userData["name"] : null,
					"total" => 0,
					"point" => Array(),
					"status" => Array()
				);
			}

			$res[$user]["total"] += $data["point"];
			$res[$user]["point"][$data["id"]] = $data["point"];

			$res[$user]["status"][$data["id"]] =
				($data["point"] === $problem["point"])
					? "correct"
					: ($data["point"] === 0)
						? "wrong"
						: "passed";

			$_list_[$data["id"]] = null;
			$nameList[$data["id"]] = $problem["name"];
		}

		foreach ($_list_ as $key => $value)
			array_push($list, $key);

		// Sort data by point
		usort($res, function($a, $b) {
			$a = $a["total"];
			$b = $b["total"];
		
			if ($a === $b)
				return 0;

			return ($a > $b) ? -1 : 1;
		});

		foreach ($res as $value) {
			$total[$value["username"]] = $value["total"];
			$overall += $total[$value["username"]];
		}
	}

	$returnData = Array(
		"list" => $list,
		"nameList" => $nameList,
		"total" => $total,
		"rank" => $res,
		"overall" => $overall
	);
	
	stop(0, "Thành công!", 200, $returnData, $returnData["overall"]);