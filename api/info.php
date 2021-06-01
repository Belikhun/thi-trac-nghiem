<?php
	//? |-----------------------------------------------------------------------------------------------|
	//? |  /api/info.php                                                                                |
	//? |                                                                                               |
	//? |  Copyright (c) 2018-2021 Belikhun. All right reserved                                         |
	//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
	//? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
	define("PAGE_TYPE", "API");
	
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/logger.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/modules/account.php";

	$username = reqQuery("u");

	if ($username !== preg_replace("/[^a-zA-Z0-9]+/", "", $username))
		stop(-1, "Tên người dùng chỉ được phép dùng các kí tự trong khoảng a-zA-Z0-9", 400);

	$acc = new Account($username);

	if (!$acc -> dataExist())
		stop(13, "Không tìm thấy tên người dùng \"$username\"!", 404, Array( "username" => $username ));

	$userData = $acc -> getDetails();
	stop(0, "Thành công!", 200, $userData);
?>