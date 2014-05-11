
(function (factory, window, document) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], function($) {
            return factory(window, document, $);
        });
    } else {
        // Browser globals
        factory(window, document, jQuery);
    }
}(function (window, document, $, undefined) {

    'use strict';

    // default option settings:
    //
    // 
    var defaults = {
        /*
        process state machine:

        init -> 
        start (snapshot) ->
            start-preview -> 
                render-for-preview ->
            finish-preview ->
            (async continue?) ->
        / abort -> EOP    
        \ start-print ->
            print ->
        finish-print ->
        (async continue?) ->
        EOP

        and

        EOP -> 
            start-rollback ->
                rollback-render ->
            finish-rollback ->
        finish ->
        THE END

        Notes:

        #A#:
        The 'rollback' phase 'recovers' the page as it was before the init/start-preview state, i.e.
        it 'resets the page to its original state / looks'.

        #B#:
        The preview phase serves two purposes:

        1: users can see what is going to be printed
        2: developers can more easily tweak the CSS and JS code for printing by having a page 'state' available which shows the page ready for printing: this reduces the round-trip time when editing CSS compared to the 'edit CSS::reload-page::print-page' cycle

        #C#:
        The print phase (and all other phases) has a 'default implementation' which can be overridden: developers can choose to supplant that implementation for a custom one. Use case example: instead of actually printing, you can use custom code to save a snapshot of the page to anywhere, because maybe you want a table dump or copy of the graphics and copypasta that one into your own app.

        #D#:
        All events are fired through callbacks: that way the developer can choose to use another event/message/comm system, e.g. postal PubSub or other means.

        #E#:
        The user can signal us at the end of the preview phase whether she wants to actually have the print process happen (continue) or not (abort). If you don't like the preview, you don't waste any more time and assets on printing it.

        #F#:
        I have pondered whether this should be a 'printable' (attribute = ability) or 'print' (action) plugin and choose the latter after some deliberation: a 'printable' approach would mean that we augment each element (or set of elements) which should be 'printable' and that would require a prototype-based approach to keep storage costs lean, while enabling developers to have all 'printables' listen for certain events (such as a request to print themselves). The 'print' action approach however would mean that we only temporarily augment one or more elements, don't have to bother about how many instances of this plugin will be alive at any one time (always one, compared to 'printable's many) but it also means we have all code more or less related to the print action linking up with the element every time we invoke (init) the action.

        */
    };

    /* @const */ var  INACTIVE_AT_INIT = 0
                    , START_SNAPSHOT = 1
                    , START_PREVIEW = 2
                    , RENDER_PREVIEW = 3
                    , FINISH_PREVIEW = 4
                    , WAITING_FOR_CONTINUE_AFTER_PREVIEW = 5
                    , START_PRINT = 6
                    , RENDER_PRINT = 7
                    , WAITING_FOR_PRINT_TO_COMPLETE = 8
                    , FINISH_PRINT = 9
                    , WAITING_FOR_CONTINUE_AFTER_PRINT = 10
                    , START_ROLLBACK = 11
                    , RENDER_ROLLBACK = 12
                    , FINISH_ROLLBACK = 13
                    , FINISHED_PRINT_OPERATION = 14
                    ;

    // The actual plugin constructor
    function PrintInPage(elements, options) {
        this.elements = elements;
        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend({}, defaults, options);
        
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

        this._currentState = INACTIVE_AT_INIT;

        this.init();
    }

    PrintInPage.prototype = {
        // set up the print operation
        //
        // Note: this is a asynchronous operation in places: we expect the event handlers to
        // invoke the continue() API to move the printing process forward after each asynchronous
        // stage (i.e. render-preview, render-for-print, rollback)
        init: function () {
            // also note that when a user/developer decides to call us on a large set of elements, then we treat those as a single group and therefor hook ONE AND THE SAME INSTANCE of us to each of them! 
            var els = this.elements;
            assert(els.length > 0);


            return this;
        },

        // start / continue the print operation
        //
        // Note: when invoked while the process is already commencing on its own, i.e. when called from an event handler during a *synchronous* action state,
        // the call is simply ignored (the return value of the event handler is observed instead)
        continue: function() {
            return this;
        },

        // Register handler(s) for the given event
        //
        // Note: this handler does *not* replace the default handler but is rather queued after it. 
        // You may queue multiple handlers for the same event this way.
        //
        // The handlers are executed in the order they are registered.
        on: function (event, handlers) {
            return this;
        },
        // Unregister the given handler(s) for this event.
        //
        // Notes: when you do not specify any handler (or `null`), then all registered handlers for this event are unregistered.
        // When you do not specify an event, then the handler is unregistered for *all* events.
        off: function(event, handlers) {
            return this;
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn.print = function (options) {
        // also note that when a user/developer decides to call us on a large set of elements, then we treat those as a single group and therefor hook ONE AND THE SAME INSTANCE of us to each of them! 
        assert(this.length > 0);
        var all_share_same_instance = [
        {
            // instance === null
            count: 0
        }];
        this.each(function() {
            var ref = $.data(this, 'plugin_printInPage');
            if (!ref) {
                all_share_same_instance[0].count++;
            } else {
                assert(ref instanceof PrintInPage);
                for (var i = 1, len = all_share_same_instance.length; i < len; i++) {
                    if (ref === all_share_same_instance[i].ref) {
                        all_share_same_instance[i].count++;
                        return;
                    }
                    // when we get here, it's yet another instance
                    all_share_same_instance[len] = {
                        ref: ref,
                        count: 1
                    };
                }
            }
        });
        // before we start the new print process, we see if e are already in a commonly shared one or we are happening right smack in the middle of other 'print' actions:
        // when we are already in another print action, then we abort immediately and signal this to the caller by throwing an exception: we do not support nesting!
        if (all_share_same_instance.length > 2 || all_share_same_instance.length === 2 && all_share_same_instance[0].count !== 0) {
            // we are inside another print action, and it's not us because either the set of elements changed since the last time or it's not just us:
            throw new Error('attempt to print a part of the page while another part is still busy printing');
        }
        var shared_instance;
        if (all_share_same_instance.length === 2) {
            // there's another print action pending. Do not init again, but simply return the active instance so we can invoke its methods!
            shared_instance = all_share_same_instance[1].ref;
        } else {
            // start the printing process!
            assert(all_share_same_instance.length === 1);
            assert(all_share_same_instance[0].count > 0);
            shared_instance = new PrintInPage(this, options);

            this.each(function() {
                $.data(this, 'plugin_printInPage', shared_instance);
            });
        }
        return shared_instance;
    };

}, window, document));
