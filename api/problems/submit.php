<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/problems/submit.php                                                                     |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
	define("PAGE_TYPE", "API");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php"; 
	
	if (!isLoggedIn())
		stop(11, "Bạn chưa đăng nhập!", 401);

	$username = $_SESSION["username"];
	checkToken();

	$id = reqForm("id");
	$data = reqType(json_decode(reqForm("data"), true), "array");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/problems/problem.php";

	if (!problemExist($id))
		stop(44, "Không tìm thấy để của id đã cho!", 404, Array( "id" => $id ));

	problemTimeRequire($id, [CONTEST_STARTED, CONTEST_NOTENDED], false);

	if (problemJudged($id, $username))
		stop(31, "Không thể nộp lại vì bài làm của bạn đã được chấm!", 403);

	problemSubmit($id, $username, $data);
	problemJudge($id, $username);

	stop(0, "Nộp bài thành công!", 200, Array( "id" => $id, "time" => time() ));