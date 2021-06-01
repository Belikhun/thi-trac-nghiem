<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/contest/problems/add.php                                                                |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/logs.php";
    
    if (!isLoggedIn())
        stop(11, "Bạn chưa đăng nhập.", 401);
    
    checkToken();
    
    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

	$id = reqForm("id");

	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/problems/problem.php";

	if (!problemExist($id))
		stop(44, "Không tìm thấy để của id đã cho!", 404, Array( "id" => $id ));

	$submitList = glob(PROBLEM_DIR ."/$id/*.submit");
	$rejudged = 0;

	foreach ($submitList as $file) {
		$username = basename($file, ".submit");
		problemJudge($id, $username);
		$rejudged++;
	}

	stop(0, "Chấm lại thành công!", 200, Array( "rejudged" => $rejudged ));