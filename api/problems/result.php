<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/problems/result.php                                                                     |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
    define("PAGE_TYPE", "API");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/modules/config.php";

	if (!isLoggedIn())
		stop(11, "Bạn chưa đăng nhập!", 401);

	$username = $_SESSION["username"];
	checkToken();

	$id = reqForm("id");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/modules/problem.php";

	if (!problemExist($id))
		stop(44, "Không tìm thấy để của id đã cho!", 404, Array( "id" => $id ));

	problemTimeRequire($id, [CONTEST_ENDED], false);

	if (!problemJudged($id, $username))
		stop(110, "Không tìm thấy kết quả làm bài của bạn!", 403);

	stop(0, "Success", 200, problemGetResult($id, $username));