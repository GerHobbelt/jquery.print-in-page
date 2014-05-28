jquery.print-in-page
====================

jquery plugin which enables you to print parts (elements) in the page without using popups or iframes: useful for complex parts which you don't want to copy / clone.




API
---

`$.fn.print(options)` -- can be used to set the options shared among all 'print-in-page' instances, i.e. use this if you want to tweak the defaults.

`$els.print(options)` -- initializes a print-in-page instance for the given DOM node collection. Returns a reference to the print-in-page instance, so that you can chain print-in-page methods.


### Events

print-in-page fires these custom events on the **print-in-page instance**:

- initPrinting -- triggered when you invoke the `.continue()` API method for the first time, starting a print process/session in your browser

- startPrintPreview -- ...

- renderPrintPreview -- override the default here when you have specific render (DOM manipulation) needs which do not complement the default behaviour. See the demo/main.js file for an example where a **supplementary filtering process** is applied in the `finishPrintPreview` event.

- finishPrintPreview -- Concludes the preview render/show process. By now we expect you to have your preview display in order and awaiting user ack/nack action.

- startPrint -- The actual printing process starts; if you need to perform some last-minute tweak, here's the place for that.

- renderPrint -- this phase is executing the actual `window.print()` call. Do not `e.preventDefault()` unless you wish to replace the actual printing process itself.

- finishPrint -- ...

- startRollbackAfterPrint -- you receive this event when the printing process has completed (`onafterprint`) or has been aborted via the `.abort()` API method

- renderRollbackAfterPrint -- the default action following this event is to restore the DOM to its original glory from before the start of preview/print session

- finishRollbackAfterPrint -- ...

- donePrinting -- this is the last event you will receive at the end of any and each print/preview session

- abortPrinting -- this event is fired when the .abort()` API method has been invoked and the current print/preview process can be aborted.






### Methods

where `*p*` is the print-in-page instance obtained via the `$elements.print()` API:

`*p*.on(event, f)` -- register function `f` for the given event.

> The handlers are executed in the order they are registered.

> `f` may be an *array* of handlers: each of these is then registered with the given event


`*p*.off(event, f)` -- unregister function `f` for the given event.

> `f` may be an *array* of handlers: each of these is then unregistered from the given event

> When you do not specify any handler (or `null`), then all registered handlers for this event are unregistered.

> When you do not specify an event, then the handler is unregistered for *all* events.


`*p*.continue()` -- start / continue the print operation
        
> Note: when invoked while the process is already commencing on its own, i.e. when called from an event handler during a *synchronous* action state,
> the call is simply ignored (the return value of the event handler is observed instead)


`*p*.prime(N)` -- prime the print operation for N `.continue()` invocations: use this method when you have multiple async processes running your event handler(s) and need *each and every one of them* to invoke `.continue()` before the print process may commence.


*p*.abort()` -- You can ABORT the print process at any time by invoking this method.

> The DOM will be restored to its original pre-print-preview glory and the print process is reset.


`*p*.isAborted()` -- truthy when the current printing session is being aborted. This flag holds until the session ends (i.e. until after the `donePrinting` event).


`*p*.isWorking()` -- truthy when the print-in-page component is considered to be 'working' i.e. when it won't liten to `.continue()` calls as it's already moving along on its own volition


`*p*.elements([$els])` -- getter/setter for the set of DOM elements which will be print/previewed. You can change the DOM element collection until the preview starts (i.e. right before the `renderPrintPreview` event) and after the original situation has been restored (i.e. just before the `finishRollbackAfterPrint` event)


`*p*.destroy()` -- alias or `.teardown()`

`*p*.teardown()` -- ... jquery teardown ...




Examples / Demos
----------------

See the `./demo` directory for several examples (demo/index.html).

**Notes**:

- All demos use [RequireJS](http://requirejs.org/) to load the JavaScript assets.

- All demos share a single JS driver file (demo/main.js)

- Check the differences in the HTML for the different examples in the `demo/` directory: these build upon one another from simple to complex, while the `main.js` driver code serves them all

- note that the (demo/restyling-and-printing.html) demo has been specifically tailored to make the actual printout **different from the preview**: by using extra print-media CSS rules and a few bits of DOM (HTML) the printout consists of multiple pages, while the preview is a single page, which does not include all the content in the lead-in page either. Check the example's HTML and CSS to observe what goes on in there.
  
