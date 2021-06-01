<?php
	//? |-----------------------------------------------------------------------------------------------|
	//? |  /modules/config.php                                                                            |
	//? |                                                                                               |
	//? |  Copyright (c) 2018-2021 Belikhun. All right reserved                                         |
	//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
	//? |-----------------------------------------------------------------------------------------------|

	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/info.php";

	define("CONFIG_FILE", $_SERVER["DOCUMENT_ROOT"] ."/data/config.json");
	define("CONFIG_EXCLUDE_TYPE", Array("note", "image"));

	define("CONFIG_STRUCTURE", Array(
		"system" => Array(
			"__icon" => "server",
			"__title" => "Hệ Thống",

			"title" => Array(
				"type" => "text",
				"label" => "Tiêu Đề Trang",
				"color" => "blue",
				"value" => "%contestName% | %name% v%version%",
				"required" => true
			),

			"image" => Array(
				"__display" => "row",

				"landing" => Array(
					"__title" => "Ảnh nền",
					"type" => "image",
					"label" => "Ảnh nền",
					"api" => "/api/images/landing",
					"display" => "square"
				),

				"icon" => Array(
					"__title" => "Icon",
					"type" => "image",
					"label" => "Icon",
					"api" => "/api/images/icon",
					"display" => "circle"
				)
			),

			"allowRegister" => Array(
				"type" => "checkbox",
				"label" => "Cho phép đăng kí tài khoản",
				"color" => "blue",
				"value" => true
			),

			"edit" => Array(
				"__title" => "Chỉnh sửa thông tin",
				"__display" => "column",

				"name" => Array(
					"type" => "checkbox",
					"label" => "Cho phép thay đổi tên",
					"color" => "blue",
					"value" => true
				),

				"password" => Array(
					"type" => "checkbox",
					"label" => "Cho phép thay đổi mật khẩu",
					"color" => "pink",
					"value" => true
				),

				"avatar" => Array(
					"type" => "checkbox",
					"label" => "Cho phép thay đổi Avatar",
					"color" => "blue",
					"value" => true
				)
			),
		),

		"contest" => Array(
			"__icon" => "file",
			"__title" => "Kì Thi",

			"htmlNote" => Array(
				"type" => "note",
				"level" => "warning",
				"text" => "<b>LƯU Ý:</b> Tên kì thi, Mô tả kì thi chấp nhận mã HTML. Hãy cẩn thận khi chèn mã HTML vào những trường này.</t>"
			),

			"name" => Array(
				"type" => "text",
				"label" => "Tên kì thi",
				"color" => "blue",
				"value" => "Thi Trắc Ngiệm",
				"required" => true
			),

			"description" => Array(
				"type" => "editor",
				"language" => "md",
				"label" => "Mô tả kì thi",
				"height" => 600,
				"value" => "Chào mừng tới hệ thống thi trắc nghiệm!",
				"required" => true
			)
		),

		"time" => Array(
			"__icon" => "clock",
			"__title" => "Thời Gian",

			"zone" => Array(
				"type" => "text",
				"label" => "Khu Vực",
				"color" => "blue",
				"value" => "Asia/Ho_Chi_Minh"
			)
		),

		"announcement" => Array(
			"__icon" => "horn",
			"__title" => "Thông Báo",

			"enabled" => Array(
				"type" => "checkbox",
				"label" => "Bật Thông Báo",
				"color" => "blue",
				"value" => false
			),

			"level" => Array(
				"type" => "select",
				"label" => "Cấp Độ",
				"color" => "blue",
				"options" => Array(
					"okay" => "Hoàn Thành",
					"info" => "Thông Tin",
					"warning" => "Cảnh Báo",
					"error" => "Lỗi"
				),
				"value" => "info"
			),

			"message" => Array(
				"type" => "textarea",
				"label" => "Nội Dung",
				"color" => "blue",
				"value" => "This is a sample Announcement <i>(with HTML!)</i>"
			)
		),

		"clientSettings" => Array(
			"__icon" => "config",
			"__title" => "Cài Đặt Mặc Định của Client",

			"sounds" => Array(
				"type" => "checkbox",
				"label" => "Bật tiếng",
				"color" => "pink",
				"value" => false
			),

			"nightmode" => Array(
				"type" => "checkbox",
				"label" => "Chế độ ban đêm",
				"color" => "pink",
				"value" => false
			),

			"showMs" => Array(
				"type" => "checkbox",
				"label" => "Hiển thị millisecond",
				"color" => "pink",
				"value" => false
			),

			"transition" => Array(
				"type" => "checkbox",
				"label" => "Hiệu ứng",
				"color" => "blue",
				"value" => true
			),
			
			"dialogProblem" => Array(
				"type" => "checkbox",
				"label" => "Xem đề bài trong cửa sổ",
				"color" => "pink",
				"value" => false
			),

			"rankUpdate" => Array(
				"type" => "range",
				"label" => "Thời gian cập nhật xếp hạng",
				"value" => 3,
				"min" => 1,
				"max" => 11,
				"step" => 1,
				"unit" => "ms/yêu cầu",
				"valueList" => Array(1 => 500, 2 => 1000, 3 => 2000, 4 => 10000, 5 => 60000, 6 => 120000, 7 => 240000, 8 => 300000, 9 => 600000, 10 => 3600000, 11 => -1),
				"valueWarn" => Array(
					"type" => "lower",
					"value" => 1000,
					"color" => "red"
				)
			),

			"hashUpdate" => Array(
				"type" => "range",
				"label" => "Thời gian cập nhật dữ liệu và cài đặt",
				"value" => 3,
				"min" => 1,
				"max" => 11,
				"step" => 1,
				"unit" => "ms/yêu cầu",
				"valueList" => Array(1 => 500, 2 => 1000, 3 => 2000, 4 => 10000, 5 => 60000, 6 => 120000, 7 => 240000, 8 => 300000, 9 => 600000, 10 => 3600000, 11 => -1),
				"valueWarn" => Array(
					"type" => "lower",
					"value" => 1000,
					"color" => "red"
				)
			)
		),

		"ratelimit" => Array(
			"__icon" => "clock",
			"__title" => "Rate Limiter",

			"enabled" => Array(
				"type" => "checkbox",
				"label" => "Bật",
				"color" => "blue",
				"value" => true
			),

			"useIP" => Array(
				"type" => "checkbox",
				"label" => "Chặn bằng địa chỉ IP thay vì chặn bằng phiên (nên tắt tùy chọn này nếu bạn mở máy chủ qua tunnel hoặc proxy)",
				"color" => "blue",
				"value" => true
			),

			"maxRequest" => Array(
				"type" => "number",
				"label" => "Số yêu cầu tối đa",
				"color" => "blue",
				"value" => 40
			),

			"requestTime" => Array(
				"type" => "number",
				"label" => "Thời gian tối đa thực hiện yêu cầu (giây)",
				"color" => "blue",
				"value" => 10
			),

			"banTime" => Array(
				"type" => "number",
				"label" => "Thời gian cấm yêu cầu (giây)",
				"color" => "blue",
				"value" => 30
			)
		),

		"cache" => Array(
			"__icon" => "file",
			"__title" => "Cache Age",

			"note" => Array(
				"type" => "note",
				"level" => "info",
				"text" => "Increasing Cache Age will reduce backend calculation. But in return it will delay live data update.<br><b>Only change these value if you know what you are doing!</b>"
			),

			"contestRank" => Array(
				"type" => "number",
				"label" => "contestRank",
				"color" => "blue",
				"value" => 1
			)
		)
	));

	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/config.php";

	define("CONFIG_CUSTOM_VAR", Array(
		"name" => APPNAME,
		"version" => VERSION,
		"author" => AUTHOR,
		"contestName" => getConfig("contest.name", false),
		"submitFolder" => getConfig("folders.submit", false),
		"root" => $_SERVER["DOCUMENT_ROOT"],
		"currentDate" => date("d/m/Y"),
		"currentTime" => date("H:i:s")
	));

	applyCustomVar($config);