requirejs.config({
	paths: {
		"jquery": "../libs/jquery",
        "assert": "../libs/assert",
		"print-in-page": "../src/jquery.print-in-page"
	}
});

require(["jquery", "assert", "print-in-page"], function ($, assert, pip) {
	var master_instance = $.fn.print({
        //...
    });
	console.log(master_instance);

/*
        this._handlers = {
            initPrinting: [],

            startPrintPreview: [],
            renderPrintPreview: [],
            finishPrintPreview: [],

            abortPrinting: [],

            startPrint: [],
            renderPrint: [],
            finishPrint: [],

            startRollbackAfterPrint: [],
            renderRollbackAfterPrint: [],
            finishRollbackAfterPrint: [],

            donePrinting: []
        };
*/
    // check if the preview panel DOM is available in the loaded page:
    // this JS code is generic for all examples, hence we need to check if certain
    // parts are available or not.
    var preview_pane_available = ($('.previewPanel').length !== 0);


	master_instance
    .on("startPrintPreview", function (e) {
        console.log("event: ", e);

        $('.print-buttons').hide();
    })
    .on("finishPrintPreview", function (e) {
        console.log("event: ", e);

        if (preview_pane_available) {
            // we have to partially undo the work done by the print-in-page plugin as we need
            // this sibling DIV to show up and it has an `!important` class style attached which would
            // be very hard to beat otherwise:  
            $('.previewPanel').show().removeClass('pip-do-not-print');
            // and ditto for this lead-in page:
            $('.print-intro-page').show().removeClass('pip-do-not-print');

            var only_treat_div_tags_to_pip = $("#only-div-nodes").prop("checked");

            // and then, when we wish to show/hide elements, we only wish treat DIV tags:
            if (only_treat_div_tags_to_pip) {
                var $sibs = $('.pip-do-not-print').not('div').removeClass('pip-do-not-print');
            }

            // signal the system that it should NOT automatically call .continue() after we are done here:
            e.stopPropagation();
        }
    })
    .on("startPrint", function (e) {
        console.log("event: ", e);

        $('.print-buttons').hide();
        $('.previewPanel').hide();
    })
    .on("startRollbackAfterPrint", function (e) {
        console.log("event: ", e);

        $('.print-buttons').show();
        $('.previewPanel').hide();
        $('.print-intro-page').hide();
    });

    var print_session_instance = null;


    $('.click-to-print').click(function (e) {
        var btn = $(this);
        var clsarr = btn.get(0).classList;
        var zone = [];
        for (var i = 0, len = clsarr.length; i < len; i++) {
            var c = clsarr[i];
            var match = /^print-area-([a-zA-Z0-9]+)$/.exec(c);
            if (match) {
                zone.push(".content-" + match[1]);
            }
        }
        zone = zone.join(", ");
        var $el_set = $(zone);
        print_session_instance = $el_set.print({
            //...
        })
        .on("finishPrintPreview", function (e) {
            console.log("button event: ", e);
        })
        .on("donePrinting", function (e) {
            console.log("button event: ", e);
        })
        .continue();
    });

    $('#preview-okay').click(function (e) {
        assert(print_session_instance);
        print_session_instance.continue();        
    });
    
    $('#preview-abort').click(function (e) {
        assert(print_session_instance);
        print_session_instance.abort();        
    });
});
