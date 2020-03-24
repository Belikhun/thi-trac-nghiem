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
    
    $list = problemList();

    usort($list, function($a, $b) {
        $a = $a["time"]["begin"];
        $b = $b["time"]["begin"];
    
        if ($a === $b)
            return 0;

        return ($a > $b) ? -1 : 1;
    });

    stop(0, "Thành công!", 200, $list, true);