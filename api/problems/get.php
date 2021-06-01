<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/problems/get.php                                                                        |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
	define("PAGE_TYPE", "API");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/modules/config.php";

	$id = reqQuery("id");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/modules/problem.php";

	if (!problemExist($id))
		stop(44, "Không tìm thấy để của id đã cho!", 404, Array( "id" => $id ));

	$problem = problemGet($id);

	if (isset($problem["thumbnail"]))
        $problem["thumbnail"] = "/api/problems/thumbnail?id=". $id;
    else
        $problem["thumbnail"] = null;

	if (isset($problem["attachment"])) {
		$f = PROBLEMS_DIR ."/". $id ."/". $problem["attachment"];
		$e = strtolower(pathinfo($problem["attachment"], PATHINFO_EXTENSION));

        $problem["attachment"] = Array(
            "file" => $problem["attachment"],
			"size" => filesize($f),
			"extension" => $e,
            "url" => "/api/problems/attachment?id=". $id,
            "embed" => in_array($e, ["pdf", "html", "png", "jpg", "svg"])
        );
    } else
        $problem["attachment"] = Array(
            "file" => null,
            "size" => 0,
            "url" => null,
            "embed" => false
		);
		
	$judged = isLoggedIn() ? problemJudged($id, $_SESSION["username"]) : null;
	$submit = isLoggedIn()
		? (problemSubmitted($id, $_SESSION["username"])
			? problemGetSubmit($id, $_SESSION["username"])
			: [])
		: [];

	$judgeResult = null;

	if ($judged && (problemTimeRequire($id, [CONTEST_ENDED]) === true))
		$judgeResult = problemGetResult($id, $_SESSION["username"]);

	stop(0, "Success", 200, Array(
		"id" => $id,
		"name" => $problem["name"],
		"point" => $problem["point"],
		"time" => $problem["time"],
		"question" => count($problem["result"]),
		"answer" => ($_SESSION["id"] === "admin") ? $problem["result"] : Array(),
		"thumbnail" => $problem["thumbnail"],
		"attachment" => $problem["attachment"],
		"judged" => isLoggedIn() ? problemJudged($id, $_SESSION["username"]) : null,
		"submit" => $submit,
		"result" => $judgeResult
	));