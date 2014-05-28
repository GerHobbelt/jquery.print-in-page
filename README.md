jQuery.print-in-page
====================

jQuery plugin which enables you to print parts (elements) in the page without using popups or iframes: useful for complex parts which you don't want to copy / clone.



Use Cases / When you want to use this
-------------------------------------


### Single Page Applications (read: lots of JavaScript in your page!)

You have a Single Page Application of some complexity and you want to print just part(s) of the DOM without having to go through the effort of setting up a proper clone/copy in an iframe -- a job which can be particularly nasty when your content is largely JavaScript generated, e.g. large data grids, dynamic graphics such as D3-based graphs, etc.. 

re it would be so good to have a little tool which would just hide and unhide the irrelevant parts of your current DOM while printing. 

Oh, and a Print Preview would be nice!



#### The Answer

Quite simple: use `jQuery.print-in-page` instead:


```
var $your_selection = $('.collect-the-DOM-leaves-you-wish-to-print');
// set up the print environment, but do NOT execute it yet.
var pip_instance = $your_selection.print();

//...

// start the printing process:
pip_instance.continue();
```

and with a preview it goes something like this:

```
var $your_selection = $('.collect-the-DOM-leaves-you-wish-to-print');
// set up the print environment, but do NOT execute it yet.
// Also hook into the post-preview to ensure we will ait for
// the user to hit 'okay' button after having seen the preview:
var pip_instance = $your_selection.print()
.on("finishPrintPreview", function (e) {
    // signal the system that it should NOT automatically 
    // call .continue() after we are done here:
    e.stopPropagation();
});

// set up the preview 'okay' button click handler to continue
// printing after having seen the preview.
$('#preview-okay').click(function (e) {
  pip_instance.continue();        
});

// ... and likewise for the 'abort' button after having seen the preview
$('#preview-abort').click(function (e) {
  pip_instance.abort();        
});

//...

// start the preview process 
// (the print process will follow automatically):
pip_instance.continue();
```

        


### Your browser environment does not allow iframes nor popup windows

In highly secure and other restricted environments where iframes are frowned upon, the 'standard' ways to print a web page are not possible (as all methods rely on either the ability to create and fill an iframe or a popup window). 


#### The Answer

Again, `jQuery.print-in-page` at your service! The example code above (see the first Use Case) merely applies a set of classes to your current DOM and that is it, really. It also invokes the standard browser print command (`window.print()`) at the appropriate time and offers a plethora of events where you can hook into the preview and print processes to further tweak your DOM. 

When all is done, the 'pip' classes are removed from the DOM again and the old situation is restored.

Easy as pie.

And no copying the DOM snapshot or otherwise into iframes or popups, hence less memory consumption by the brwoser too!




---




API
---

`$.fn.print(options)` -- can be used to set the options shared among all 'print-in-page' instances, i.e. use this if you want to tweak the defaults.

`$els.print(options)` -- initializes a print-in-page instance for the given DOM node collection. Returns a reference to the print-in-page instance, so that you can chain print-in-page methods.



### Options

You can override the class names applied by jQuery.print-in-page to accomplish the show/hide of the relevant DOM content. Here's the default set:

```
{
  printLeafClass:         "pip-print",
  printParentClass:       "pip-print-parent",
  printRootClass:         "pip-print-root",
  notPrintedLeafClass:    "pip-do-not-print"
};
```

which you may override by specifying different class names in the `.print(options)` like this:

```
// tweak the global instance, which serves as a 
// defaults container for all .print() sessions
// yet to come:
$.fn.print({
  printLeafClass:         "myApp-show-leaf",
  printParentClass:       "myApp-show-parent",
  printRootClass:         "myApp-show-root",
  notPrintedLeafClass:    "myApp-doNotShow-sibling-leaf"
};
```

or 

```
// set up a special set of classes for this particular
// instance:
var pip = $('table.report').print({
  printLeafClass:         "report-show-on-print",
  printParentClass:       "report-show-on-print",
  printRootClass:         "report-show-on-print",
  notPrintedLeafClass:    "report-hide-on-print"
};

//...
pip.continue();
```





### Events

print-in-page fires these custom events on the **print-in-page instance**:

- initPrinting -- triggered when you invoke the `.continue()` API method for the first time, starting a print process/session in your browser

- startPrintPreview -- ...

- renderPrintPreview -- override the default here when you have specific render (DOM manipulation) needs which do not complement the default behaviour. See the [`scripts/main.js`](scripts/main.js) file for an example where a **supplementary filtering process** is applied in the `finishPrintPreview` event.

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

`*p*.teardown()` -- ... jQuery teardown ...








---




Examples / Demos
----------------

See the `./demo` directory for [several examples](demo/index.html).

**Notes**:

- All demos use [RequireJS](http://requirejs.org/) to load the JavaScript assets.

- All demos share [a single JS driver file](scripts/main.js).

- Check the differences in the HTML for the different examples in the `demo/` directory: these build upon one another from simple to complex, while the [`main.js`](scripts/main.js) driver code serves them all.

- note that the [restyling demo](demo/restyling-and-printing.html) has been specifically tailored to make the actual printout **different from the preview**: by using extra print-media CSS rules and a few bits of DOM (HTML) the printout consists of multiple pages, while the preview is a single page, which does not include all the content in the lead-in page either. Check the example's HTML and CSS to observe what goes on in there.
  
