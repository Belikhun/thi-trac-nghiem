<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /data/info.php                                                                               |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2021 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
	//? |-----------------------------------------------------------------------------------------------|
	
	//! PLEASE DO NOT MODIFY ANY Code Headers AND LICENSE FILE!
	//? FOR MORE DETAILS, PLEASE REFER TO https://tldrlegal.com/license/mit-license

	define("APPNAME", "Thi Trắc Nghiệm");
	define("AUTHOR", "Belikhun");
	define("VERSION", "1.0.1");
	define("VERSION_TAG", "release");
	define("REPO_ADDRESS", "https://github.com/belivipro9x99/thi-trac-nghiem");
	define("REPORT_ERROR", REPO_ADDRESS . "/issues");
	define("CONTACT_LINK", "http://m.me/belivipro9x99");
	define("TRACK_ID", "UA-124598427-4");

	// SIZE LIMIT
	define("MAX_UPLOAD_SIZE", 10*1024*1024);
	define("MAX_IMAGE_SIZE", 2097153);
	define("MAX_ATTACHMENT_SIZE", 268435456);
	
	define("UPLOAD_ALLOW", Array("pas", "cpp", "c", "pp", "exe", "class", "py", "java"));
	define("IMAGE_ALLOW", Array("jpg", "png", "gif", "webp"));

	// PATH
	define("AVATAR_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/avatar");
	define("PROBLEMS_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/problems");

	// CACHE
	define("CACHE_LOCATION", $_SERVER["DOCUMENT_ROOT"] ."/.cache");
	define("CACHE_DEFAULT_AGE", 10);