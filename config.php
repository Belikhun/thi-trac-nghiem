<?php
	//? |-----------------------------------------------------------------------------------------------|
	//? |  config.php                                                                                   |
	//? |                                                                                               |
	//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
	//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
	//? |-----------------------------------------------------------------------------------------------|
	
	require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/info.php";

?>

<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Cài đặt | <?php print APPNAME ." v". VERSION; ?></title>
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/default.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/statusBar.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/scrollBar.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/input.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/switch.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/button.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/slider.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/spinner.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/menu.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/css/configPage.css?v=<?php print VERSION; ?>" />
	<!-- Fonts -->
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/calibri/calibri.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/nunito/nunito.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/opensans/opensans.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/materialicons/materialicons.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/consolas/consolas.css?v=<?php print VERSION; ?>" />
	<link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/fontawesome/fontawesome.css?v=<?php print VERSION; ?>" />
</head>

<body id="container">

	<div class="wrapper">
		<form id="formContainer" class="menu" action="javascript:void(0);">
			<div class="group home">
				<t class="title big">Admin Control Panel</t>
				<t class="title small">Thay đổi cài đặt hệ thống</t>

				<div class="space"></div>

				<div class="item lr info sound" data-soundhoversoft>
					<div class="left">
						<t>Danh sách các biến có sẵn</t>
						<ul class="text" style="user-select: text">
							<li><b>%name%</b>: Tên dự án</li>
							<li><b>%version%</b>: Phiên bản</li>
							<li><b>%author%</b>: Tên tác giả</li>
							<li><b>%appTitle%</b>: Tên kì thi</li>
							<li><b>%root%</b>: Thư mục gốc của hệ thống</li>
							<li><b>%currentDate%</b>: Ngày hiện tại</li>
							<li><b>%currentTime%</b>: Thời gian hiện tại</li>
						</ul>
					</div>
					<div class="right"></div>
				</div>
			</div>

			<div class="group server">
				<t class="title">Hệ Thống</t>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="pageTitle" type="text" class="formField" autocomplete="off" placeholder="Tiêu đề trang" required>
						<label for="pageTitle">Tiêu đề trang</label>
					</div>
				</div>

				<div class="item lr sound imageChanger" data-soundhoversoft>
					<span class="left">
						<t class="title small">Icon</t>

						<div class="row">
							<input type="file" id="pageIconInput" accept="image/*">
							<label for="pageIconInput" class="lazyload column pageIcon sound" data-soundhover data-soundselect>
								<img id="pageIcon" src=""/>
								<div class="simple-spinner"></div>
							</label>

							<button type="button" id="pageIconReset" class="sq-btn pink sound" data-soundhover data-soundselect>Đặt Lại</button>
						</div>
					</span>

					<span class="middle">
						<t class="title small">Ảnh nền</t>

						<div class="row">
							<input type="file" id="landingImageInput" accept="image/*">
							<label for="landingImageInput" class="lazyload column landingImage sound" data-soundhover data-soundselect>
								<img id="landingImage" src=""/>
								<div class="simple-spinner"></div>
							</label>

							<button type="button" id="landingImageReset" class="sq-btn pink sound" data-soundhover data-soundselect>Đặt Lại</button>
						</div>
					</span>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Cho phép đăng kí tài khoản</t>
					<label class="sq-checkbox right">
						<input id="allowRegister" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Cho phép thay đổi tên</t>
					<label class="sq-checkbox right">
						<input id="editName" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Cho phép thay đổi mật khẩu</t>
					<label class="sq-checkbox pink right">
						<input id="editPassword" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Cho phép thay đổi Avatar</t>
					<label class="sq-checkbox right">
						<input id="editAvatar" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>
			</div>

			<div class="group file">
				<t class="title">Kì thi</t>
				
				<div class="item lr warning sound" data-soundhoversoft>
					<t class="left"><b>LƯU Ý:</b> Tên kì thi, Mô tả kì thi chấp nhận mã HTML. Hãy cẩn thận khi chèn mã HTML vào những trường này.</t>
					<div class="right"></div>
				</div>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="contest_name" type="text" class="formField" autocomplete="off" placeholder="Tên kì thi" required>
						<label for="contest_name">Tên kì thi</label>
					</div>
				</div>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="contest_description" type="text" class="formField" autocomplete="off" placeholder="Mô tả kì thi" required>
						<label for="contest_description">Mô tả kì thi</label>
					</div>
				</div>
			</div>

			<div class="group clock">
				<t class="title">Thời gian</t>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="time_zone" type="text" class="formField" autocomplete="off" placeholder="Khu vực" required>
						<label for="time_zone">Khu vực</label>
					</div>
				</div>
			</div>

			<div class="group config">
				<t class="title">Cài Đặt Mặc Định của Client</t>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Bật tiếng</t>
					<label class="sq-checkbox pink right">
						<input id="clientSounds" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Chế độ ban đêm</t>
					<label class="sq-checkbox pink right">
						<input id="clientNightmode" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Hiển thị millisecond</t>
					<label class="sq-checkbox pink right">
						<input id="clientShowMs" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>

				<div class="item lr sound" data-soundhoversoft>
					<t class="left">Hiệu ứng</t>
					<label class="sq-checkbox blue right">
						<input id="clientTransition" type="checkbox" class="sound" data-soundcheck>
						<span class="checkmark"></span>
					</label>
				</div>
			</div>

			<div class="group clock">
				<t class="title">RateLimit</t>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="ratelimit_maxRequest" type="number" class="formField" autocomplete="off" placeholder="Số yêu cầu tối đa" required>
						<label for="ratelimit_maxRequest">Số yêu cầu tối đa</label>
					</div>
				</div>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="ratelimit_time" type="number" class="formField" autocomplete="off" placeholder="Thời gian (giây)" required>
						<label for="ratelimit_time">Thời gian tối đa thực hiện yêu cầu (giây)</label>
					</div>
				</div>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="ratelimit_banTime" type="number" class="formField" autocomplete="off" placeholder="Thời gian cấm yêu cầu (giây)" required>
						<label for="ratelimit_banTime">Thời gian cấm yêu cầu (giây)</label>
					</div>
				</div>

			</div>

			<div class="group file">
				<t class="title">Cache Age</t>

				<div class="item lr info sound" data-soundhoversoft>
					<t class="left">
						Increasing Cache Age will reduce backend calculation. But in return it will delay live data update.
						<br><b>Only change these value if you know what you are doing!</b></t>
					<div class="right"></div>
				</div>

				<div class="item sound" data-soundhoversoft>
					<div class="formGroup sound" data-color="blue" data-soundselectsoft>
						<input id="cache_contestRank" type="number" class="formField" autocomplete="off" placeholder="api.contest.rank" required>
						<label for="cache_contestRank">api.contest.rank</label>
					</div>
				</div>
			</div>

			<div class="footer">
				<button type="submit" class="sq-btn green sound" data-soundhover data-soundselect>Lưu thay đổi</button>
			</div>

		</form>
	</div>

	<script>
		const API_TOKEN = `<?php print isset($_SESSION["apiToken"]) ? $_SESSION["apiToken"] : null; ?>`;
		const USERNAME = `<?php print $_SESSION["username"]; ?>`;
	</script>
	<script src="/assets/js/belibrary.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
	<script src="/assets/js/errorHandler.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
	<script src="/assets/js/statusBar.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
	<script src="/assets/js/sounds.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
	<script src="/assets/js/config.js?v=<?php print VERSION; ?>" type="text/javascript"></script>

	<!-- Global site tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=<?php print TRACK_ID; ?>"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag() { dataLayer.push(arguments) }
		gtag("js", new Date());

		gtag("config", `<?php print TRACK_ID; ?>`);
	</script>
</body>

</html>