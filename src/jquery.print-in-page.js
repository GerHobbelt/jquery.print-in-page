
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
        printLeafClass:         "pip-print",
        printParentClass:       "pip-print-parent",
        printRootClass:         "pip-print-root",
        notPrintedLeafClass:    "pip-do-not-print"
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


    // ## Reference Material
    //
    // https://developer.mozilla.org/en-US/docs/Web/API/Window.print
    //
    // > Note: You can also use window.onbeforeprint and window.onafterprint to assign handlers for these events, 
    // > but using element.addEventListener() is preferred.
    //
    // http://tjvantoll.com/2012/06/15/detecting-print-requests-with-javascript/

    var system_handlers_initialized = 0;
    var system_has_print_events = false;

    /* @const */ var SYSTEM_HAS_BEFOREAFTERPRINT = 1
                   , SYSTEM_HAS_LEGACY_BEFOREAFTERPRINT = 2
                   , SYSTEM_HAS_MEDIAQUERY_LISTENER = 3
                   ;

    function registerSystemHandlers() {
        system_handlers_initialized++;
        if (system_handlers_initialized !== 1) return system_handlers_initialized;

        if (window.addEventListener) {
            window.addEventListener("beforeprint", onBeforePrintHandler, false);
            window.addEventListener("afterprint", onAfterPrintHandler, false);
            window.addEventListener("unload", onUnloadPageHandler, false);
            system_has_print_events = SYSTEM_HAS_BEFOREAFTERPRINT;
        } else if (window.onbeforeprint && window.onafterprint && window.onunload) {
            window.onbeforeprint = onBeforePrintHandler;
            window.onafterprint = onAfterPrintHandler;
            window.onunload = onUnloadPageHandler;
            system_has_print_events = SYSTEM_HAS_LEGACY_BEFOREAFTERPRINT;
        }

        if (window.matchMedia) {
            var mediaQueryList = window.matchMedia('print');
            assert(mediaQueryList);
            mediaQueryList.addListener(onMediaQueryMatchHandler);
            system_has_print_events = SYSTEM_HAS_MEDIAQUERY_LISTENER;
        }

        return 0;
    }

    function UNregisterSystemHandlers() {
        system_handlers_initialized--;
        if (system_handlers_initialized < 0) {
            assert(0, "unbalanced set of invocations of registerSystemHandlers() vs UNregisterSystemHandlers(): latter is called too often!");
            system_handlers_initialized = 0;
        }

        // ALWAYS attempt to remove the handlers: this will help us recover from very bad juju situations too...        
        if (window.removeEventListener) {
            window.removeEventListener("beforeprint", onBeforePrintHandler);
            window.removeEventListener("afterprint", onAfterPrintHandler);
            window.removeEventListener("unload", onUnloadPageHandler);
        }

        if (window.matchMedia) {
            var mediaQueryList = window.matchMedia('print');
            assert(mediaQueryList);
            mediaQueryList.removeListener(onMediaQueryMatchHandler);
        }
    }


    function printThePage() {
        window.print();
    }

    var registered_print_sessions = [];

    function registerPrintSession(self) {
        var pos = registered_print_sessions.indexOf(self);
        if (pos === -1) {
            registered_print_sessions.push(self);
        }
    }

    function UNregisterPrintSession(self) {
        var pos = registered_print_sessions.indexOf(self);
        if (pos !== -1) {
            registered_print_sessions.splice(pos, 1);
        }
    }


    function onMediaQueryMatchHandler(mql) {
        if (mql.matches) {
            onBeforePrintMediaHandler();
        } else {
            onAfterPrintMediaHandler();
        }
    }

    function onBeforePrintHandler() {
        for (var i = 0, len = registered_print_sessions.length; i < len; i++) {
            var self = registered_print_sessions[i];
            self._beforePrintEventHasFired++;
        }
    }

    function onAfterPrintHandler() {
        for (var i = 0, len = registered_print_sessions.length; i < len; i++) {
            var self = registered_print_sessions[i];
            self._afterPrintEventHasFired++;
        }
    }

    function onUnloadPageHandler() {
        for (var i = 0, len = registered_print_sessions.length; i < len; i++) {
            var self = registered_print_sessions[i];
            self.abort();
        }
    }
    
    function onBeforePrintMediaHandler() {
        for (var i = 0, len = registered_print_sessions.length; i < len; i++) {
            var self = registered_print_sessions[i];
            self._beforePrintEventHasFired++;
        }
    }

    function onAfterPrintMediaHandler() {
        for (var i = 0, len = registered_print_sessions.length; i < len; i++) {
            var self = registered_print_sessions[i];
            self._afterPrintEventHasFired++;
        }
    }


    var global_master_instance = null;

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

    var executors = [
        /* state: INACTIVE_AT_INIT */
        function (self) {
            // this one only gets executed after the previous FINISHED_PRINT_OPERATION has completed...
            //
            // do NOT .continue() from this one: we require the coder/user to call that API explicitly to start 
            // the print process.
            self._working = 0;
            self._set_locked = false;
            self._beforePrintEventHasFired = 0;
            self._afterPrintEventHasFired = 0;

            self._aborted = false;          // and reset the ABORT bit for the next round of printing 

            UNregisterPrintSession(self);
            
            resetTheDOM.call(self);
        },
        /* START_SNAPSHOT */
        function (self) {
            registerPrintSession(self);

            self._beforePrintEventHasFired = 0;
            self._afterPrintEventHasFired = 0;

            trigger_and_exec.call(self, "initPrinting", function (e) {

            });
        },
        /* START_PREVIEW */
        function (self) {
            trigger_and_exec.call(self, "startPrintPreview", function (e) {
            });
        },
        /* RENDER_PREVIEW */
        function (self) {
            self._set_locked = true;

            trigger_and_exec.call(self, "renderPrintPreview", function (e) {
                // we now have a set of elements to print / preview:
                // first we need to 'separate these out' by hiding the rest of the DOM tree.
                //
	    	// Keep in mind that we expect we've got multiple elements to print,
		// in other words: `.elements().length > 1`
		//
		// The transformation process (v1.0)
		// ---------------------------------
		//
		// mark each leaf (= node listed in `.elements()`) as 'printing', 
		// mark all its parents as 'parent' and when an element in the 'leaves' list 
		// (i.e. `.elements()`) turns out to be a parent of another leaf, 
		// remove the other from the set of elements which' siblings should 
		// be marked 'NOT-printing'.
		//
		// When all elements have been marked, then go through that 
		// 'siblings-not-printing' list and mark each sibling which has not been 
		// marked as 'printing' or 'parent' yet as 'NOT-printing'.
		//
		// The idea being that the selection set to be printed can overlap internally 
		// for maximum flexibility and the above algorithm will prevent the wrong nodes 
		// from being marked as NON-printing: the CSS stylesheet can now easily identify 
		// which bits show and which don't.
		//  
		// Having the parents marked up as well is another simplification for the stylesheet: 
		// anyone which doesn't have a 'parent' or 'printing' class attached 
		// should NOT be printed. Hence it may be argued that the siblings-not-printing set 
		// is superfluous.
		//
		//
		// The transformation process (v1.0)
		// ---------------------------------
		//
		// Like the above (now removed) code, we still 'flag' all siblings of leaves 
		// as non-printing to arrive at a minimal set of nodes to 'display:none'.
		//
		// However it turned out to be much faster and simpler in terms of LOC (Lines Of Code)
		// to do this through a series of jQuery/CSS selectors:
		//
		// 1. tag the leaves as 'printing'
		// 2. tag the parents as 'printing'
		// 3. tag the siblings of leaves as 'not-printing'
		// 4. tag the siblings of parents as 'not-printing'
		// 5. undo the 'not-printing' tag for any childs of leaves (this last step enables us
		//    to work with input element sets which 'overlap', i.e. where a parent and a child 
		//    are both listed in the `.elements()`.
		//
		// Generic approach
		// ----------------
		// 
                // We do this by tagging each of the selected DOM elements with a 'print' class,
                // while tagging each of their parents with a 'print-parent' class, 
                // meanwhile tracking which elements are only 'print':
                // when we are done with this, the 'only-print' DOM elements' siblings are tagged
                // as 'not-print' to ensure the siblings don't get shown while the parent is
                // marked as 'viewable during print'.
                var $els = this.elements();

                var leafClass = this.settings.printLeafClass;
                var parentClass = this.settings.printParentClass;
                var leafClassNoPrint = this.settings.notPrintedLeafClass;
                var rootClass = this.settings.printRootClass;

                $els.addClass(leafClass);

                var $parents = $els.parents();
                $parents.addClass(parentClass);

                var $siblings = $els.siblings();
                $siblings.not("." + parentClass + ",." + leafClass).addClass(leafClassNoPrint);

                var $parentsiblings = $parents.siblings();
                $parentsiblings.not("." + parentClass + ",." + leafClass).addClass(leafClassNoPrint);

                var $children = $("." + leafClass + " ." + leafClassNoPrint);
                $children.removeClass(leafClassNoPrint);

                // see also: http://stackoverflow.com/questions/6638563/best-way-to-reference-root-html-element-with-jquery
                $(document.documentElement).addClass(rootClass);
            });
        },
        /* FINISH_PREVIEW */
        function (self) {
            // alternative starting point to listen to system print events:
            registerPrintSession(self);

            trigger_and_exec.call(self, "finishPrintPreview", function (e) {

            });
        },
        /* WAITING_FOR_CONTINUE_AFTER_PREVIEW */
        function (self) {
            trigger_and_exec.call(self, null, function (e) {

            });
        },
        /* START_PRINT */
        function (self) {
            trigger_and_exec.call(self, "startPrint", function (e) {

            });
        },
        /* RENDER_PRINT */
        function (self) {
            trigger_and_exec.call(self, "renderPrint", function (e) {
                printThePage.call(this);

                // let the beforeprint event trigger the next state via .continue(), 
                // if it hasn't already done so -- which MAY happen when the user is a hasty fella
                // who hits the 'print' shortcut or browser command while we're still in the
                // preview states...
                if (system_has_print_events && !this._beforePrintEventHasFired && !this._aborted) {
                    e.stopPropagation();
                }
            });
        },
        /* WAITING_FOR_PRINT_TO_COMPLETE */
        function (self) {
            trigger_and_exec.call(self, null, function (e) {

            });
        },
        /* FINISH_PRINT */
        function (self) {
            trigger_and_exec.call(self, "finishPrint", function (e) {
                // let the afterprint event trigger the next state via .continue(), 
                // if it hasn't already done so -- which MAY happen when the user is a hasty fella
                // who hits the 'print' shortcut or browser command while we're still in the
                // preview states...
                if (system_has_print_events && this._beforePrintEventHasFired && !this._afterPrintEventHasFired && !this._aborted) {
                    // let the afterprint event trigger the next state via .continue():
                    e.stopPropagation();
                }
            });
        },
        /* WAITING_FOR_CONTINUE_AFTER_PRINT */
        function (self) {
            trigger_and_exec.call(self, null, function (e) {

            });
        },
        /* START_ROLLBACK */
        function (self) {
            UNregisterPrintSession(self);

            trigger_and_exec.call(self, "startRollbackAfterPrint", function (e) {

            });
        },
        /* RENDER_ROLLBACK */
        function (self) {
            trigger_and_exec.call(self, "renderRollbackAfterPrint", function (e) {
                // we now undo what we have done before:
                //
                // we simply kill all the print styling which we applied to the DOM tree before.
                resetTheDOM.call(self);
            });
        },
        /* FINISH_ROLLBACK */
        function (self) {
            self._set_locked = false;

            trigger_and_exec.call(self, "finishRollbackAfterPrint", function (e) {

            });
        },
        /* FINISHED_PRINT_OPERATION */
        function (self) {
            trigger_and_exec.call(self, "donePrinting", function (e) {

            });
        }
    ];

    function resetTheDOM() {
        // we simply kill all the print styling which we MAY have applied to the DOM tree before.
        // 
        // Note that this 'restoration process' is agnostic with regards to the
        // exact state of the work in the 'print preview setup' phases: it is done
        // this way to ensure that *any* print/preview process gets undone right here,
        // even when said process was botched or otherwise unfinished/incomplete.
        var leafClass = this.settings.printLeafClass;
        var parentClass = this.settings.printParentClass;
        var leafClassNoPrint = this.settings.notPrintedLeafClass;
        var rootClass = this.settings.printRootClass;

        $("." + leafClass).removeClass(leafClass);
        $("." + parentClass).removeClass(parentClass);
        $("." + leafClassNoPrint).removeClass(leafClassNoPrint);

        // see also: http://stackoverflow.com/questions/6638563/best-way-to-reference-root-html-element-with-jquery
        $(document.documentElement).removeClass(rootClass);
    }

    function trigger_and_exec(eventType, exec_f) {
        assert(this instanceof PrintInPage);

        eventType = eventType || "__pending_state__" /* bogus event name */;

        // reset 'working' flag so user code triggered via the subsequent event can invoke the .continue() API:
        this._working = 0;

        // Create a new jQuery.Event object without the "new" operator.
        var e = jQuery.Event(eventType);
        e.currentTarget = this.elements();
        e.delegateTarget = this.elements();
        e.target = this.elements();
        e.data = this;
        assert(!e.isDefaultPrevented());
        assert(!e.isPropagationStopped());
        assert(!e.isImmediatePropagationStopped());

        assert(this._handlers);
        var harr = this._handlers[eventType];
        if (harr && harr.length > 0) {
            for (var i = 0; i < harr.length; i++) {
                var f = harr[i];
                assert(f);
                f.call(this, e);
                if (e.isImmediatePropagationStopped())
                    break;
            }
        }
        
        if (!e.isDefaultPrevented() && exec_f) {
            exec_f.call(this, e);
        }
        if (!e.isPropagationStopped()) {
            this.continue();
        }
    }


    // The actual plugin constructor
    function PrintInPage(elements, options) {
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        var glbl = global_master_instance || {};
        this.settings = $.extend({}, defaults, glbl.options, options);
        
        this._handlers = $.extend(true, {
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
        }, glbl._handlers);

        this._set_locked = false;               // `true` means the DOM node set cannot be changed any more until the print process has completed or aborted
        this._aborted = false;                  // `true` means this print run has been aborted 
        this._working = 0;                      // > 0 means we're currently executing the state process 
        this._currentState = INACTIVE_AT_INIT;
        this._beforePrintEventHasFired = 0;

        this.init(elements);
    }

    PrintInPage.prototype = {
        // set up the print operation
        //
        // Note: this is a asynchronous operation in places: we expect the event handlers to
        // invoke the continue() API to move the printing process forward after each asynchronous
        // stage (i.e. render-preview, render-for-print, rollback)
        init: function ($elements) {
            // this may seem obnoxious, but when severe errors happen and we temporarily reset the registrations, this one will save our bacon: 
            registerSystemHandlers();

            this.elements($elements);

            assert(executors[this._currentState]);
            executors[this._currentState](this);

            return this;
        },

        // start / continue the print operation
        //
        // Note: when invoked while the process is already commencing on its own, i.e. when called from an event handler during a *synchronous* action state,
        // the call is simply ignored (the return value of the event handler is observed instead)
        continue: function() {
            this._working++;
            if (this._working === 1) {
                this._currentState++;
                if (this._currentState > FINISHED_PRINT_OPERATION) {
                    this._currentState = INACTIVE_AT_INIT;
                }

                assert(executors[this._currentState]);
                executors[this._currentState](this);
            }
            return this;
        },

        // prime the print operation for N .continue() invocations: use this method
        // when you have multiple async processes running your event handler(s) and need
        // *each and every one of them* to invoke `.continue()` before the print process
        // may commence.
        prime: function(n) {
            n = n | 0;
            n = n || 1;
            this._working = 1 - n;
            return this;
        },

        // You can ABORT the print process at any time by invoking this method.
        //
        // The DOM will be restored to its original pre-print-preview glory and the print process is reset.
        abort: function () {
            // only execute the abort *when there's anything to abort*:
            if (this._currentState !== INACTIVE_AT_INIT) {
                // make sure any subsequent .continue() calls fall on their face, apart from the one we will invoke via the event trigger:
                if (this._working <= 0 || !this._aborted) {
                    this._working = 0;
                    this._currentState = START_ROLLBACK - 1;  // correct for the subsequent .continue()
                    this._aborted = true;

                    trigger_and_exec.call(this, "abortPrinting", function (e) {
                        // either user event handler called .continue() and we've moved into the START_ROLLBACK state already,
                        // OR we are not there yet:
                        if (this._currentState === START_ROLLBACK - 1) {
                            assert(this._aborted);
                            assert(this._working === 0);
                        } else {
                            assert(this._currentState === START_ROLLBACK);
                            assert(this._aborted);
                            assert(this._working > 0);
                        }
                    });
                }
            }
            return this;
        },

        isAborted: function () {
            return this._aborted;
        },

        isWorking: function() {
            return this._working > 0;
        },

        // getter/setter for the set of DOM elements which will be print/previewed:
        elements: function($set) {
            if ($set == null) {
                return this._elements;
            } else if (!this._set_locked) {
                this._elements = $($set);
            }
            return this;
        },

        // Register handler(s) for the given event
        //
        // Note: this handler does *not* replace the default handler but is rather queued after it. 
        // You may queue multiple handlers for the same event this way.
        //
        // The handlers are executed in the order they are registered.
        on: function (event, handlers) {
            var harr = this._handlers;
            if (!Array.isArray(handlers)) {
                handlers = [handlers];
            }
            assert(handlers.length > 0);
            var hit = event.split(',').map(function (d, i) {
                return d.trim();
            });
            for (var id in harr) {
                var hlist = harr[id];
                var pos = hit.indexOf(id);
                if (pos !== -1) {
                    hit.splice(pos, 1);
                    for (var i = 0, len = handlers.length; i < len; i++) {
                        var f = handlers[i];
                        if (hlist.indexOf(f) === -1) {
                            hlist.push(f);
                        }
                    }
                }
            }
            assert(hit.length === 0, "all events have been registered as they were known to the print-in-page plugin");
            return this;
        },
        
        // Unregister the given handler(s) for this event.
        //
        // Notes: when you do not specify any handler (or `null`), then all registered handlers for this event are unregistered.
        // When you do not specify an event, then the handler is unregistered for *all* events.
        off: function(event, handlers) {
            var harr = this._handlers;
            if (!handlers) {
                handlers = false;
            } else if (!Array.isArray(handlers)) {
                handlers = [handlers];
            }
            var do_all = !event;
            var hit = (event || '').split(',').map(function (d, i) {
                return d.trim();
            });
            for (var id in harr) {
                var hlist = harr[id];
                var pos = hit.indexOf(id);
                if (pos !== -1 || do_all) {
                    if (pos !== -1) {
                        hit.splice(pos, 1);
                    }
                    if (handlers === false) {
                        // unregister all handlers:
                        this._handlers[id] = [];
                    } else {
                        assert(handlers.length > 0);
                        for (var i = 0, len = handlers.length; i < len; i++) {
                            var f = handlers[i];
                            var fpos = hlist.indexOf(f);
                            if (fpos !== -1) {
                                hlist.splice(fpos, 1);
                            }
                        }
                    }
                }
            }
            assert(hit.length === 0, "all events have been unregistered as they were known to the print-in-page plugin");
            return this;
        },

        destroy: function () {
            this.teardown();
            return this;
        },

        teardown: function () {
            var harr = this._handlers;
            for (var id in harr) {
                harr[id] = [];
            }

            UNregisterSystemHandlers();
            
            return this;
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn.print = function (options) {
        // note that when a user/developer decides to call us on a large set of elements, then we treat those as a single group and therefor hook ONE AND THE SAME INSTANCE of us to each of them!

        // before we start the new print process, we see if we are already in a commonly shared one or we are happening right smack in the middle of other 'print' actions:
        // when we are already in another print action, then we abort immediately and signal this to the caller by throwing an exception: we do not support nesting!

        var shared_instance; 
        if (this.length === 0) {
            if (global_master_instance) {
                shared_instance = global_master_instance;
            } else {
                global_master_instance = shared_instance = new PrintInPage(this, options);
            }
        } else {
            shared_instance = new PrintInPage(this, options);
        }
        return shared_instance;
    };

}, window, document));





/*
'T͎͍̘͙̖̤̉̌̇̅ͯ͋͢͜͝H̖͙̗̗̺͚̱͕̒́͟E̫̺̯͖͎̗̒͑̅̈ ̈ͮ̽ͯ̆̋́͏͙͓͓͇̹<̩̟̳̫̪̇ͩ̑̆͗̽̇͆́ͅC̬͎ͪͩ̓̑͊ͮͪ̄̚̕Ě̯̰̤̗̜̗͓͛͝N̶̴̞͇̟̲̪̅̓ͯͅT͍̯̰͓̬͚̅͆̄E̠͇͇̬̬͕͖ͨ̔̓͞R͚̠̻̲̗̹̀>̇̏ͣ҉̳̖̟̫͕ ̧̛͈͙͇͂̓̚͡C͈̞̻̩̯̠̻ͥ̆͐̄ͦ́̀͟A̛̪̫͙̺̱̥̞̙ͦͧ̽͛̈́ͯ̅̍N̦̭͕̹̤͓͙̲̑͋̾͊ͣŅ̜̝͌͟O̡̝͍͚̲̝ͣ̔́͝Ť͈͢ ̪̘̳͔̂̒̋ͭ͆̽͠H̢͈̤͚̬̪̭͗ͧͬ̈́̈̀͌͒͡Ơ̮͍͇̝̰͍͚͖̿ͮ̀̍́L͐̆ͨ̏̎͡҉̧̱̯̤̹͓̗̻̭ͅḐ̲̰͙͑̂̒̐́̊'

H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ"
*/



