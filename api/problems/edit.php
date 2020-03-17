<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/contest/problems/edit.php                                                               |
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

    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/problems/problem.php";

    $id = preg_replace("/[.\/\\\\]/m", "", reqForm("id"));
    $problem = problemGet($id);

    $name = getForm("name");
    $point = withType(getForm("point"), "integer");
    $begin = reqType(getForm("begin", $problem["time"]["begin"]), "integer");
    $during = reqType(getForm("during", $problem["time"]["during"]), "integer");
    $offset = reqType(getForm("offset", $problem["time"]["offset"]), "integer");
    $thumbnail = isset($_FILES["thumbnail"]) ? $_FILES["thumbnail"] : null;
    $attachment = isset($_FILES["attachment"]) ? $_FILES["attachment"] : null;
    $result = isset($_POST["result"]) ? json_decode($_POST["result"], true) : null;

    $code = problemEdit($id, Array(
        "name" => $name,
        "point" => $point,
        "time" => Array(
            "begin" => $begin,
            "during" => $during,
            "offset" => $offset,
        ),
        "result" => $result
    ), $thumbnail, $attachment);

    switch ($code) {
        case PROBLEM_OKAY:
            writeLog("OKAY", "Đã chỉnh sửa đề \"$id\"");
            stop(0, "Chỉnh sửa đề thành công!", 200, Array( "id" => $id ));
            break;
        case PROBLEM_ERROR_IDREJECT:
            stop(45, "Không tìm thấy đề của id đã cho!", 404, Array( "id" => $id ));
            break;
        case PROBLEM_ERROR_FILEREJECT:
            stop(43, "Không chấp nhận loại tệp!", 400, Array( "id" => $id, "allow" => IMAGE_ALLOW ));
            break;
        case PROBLEM_ERROR_FILETOOLARGE:
            stop(42, "Tệp quá lớn!", 400, Array( "id" => $id, "image" => MAX_IMAGE_SIZE, "attachment" => MAX_ATTACHMENT_SIZE ));
            break;
        case PROBLEM_ERROR:
            stop(-1, "Lỗi không rõ.", 500, Array( "id" => $id ));
            break;
    }