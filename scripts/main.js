requirejs.config({
	paths: {
		"jquery": "../libs/jquery",
		"print-in-page": "../src/jquery.print-in-page"
	}
});

require(["jquery", "print-in-page"], function ($, pip) {
	$(function () {
		var instance = ($("body").myWidget());
		console.log(instance);

		instance.myWidget("methodB");
	});
});
