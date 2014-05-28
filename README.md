jQuery.print-in-page
====================

jQuery plugin which enables you to print parts (elements) in the page without using popups or iframes: useful for complex parts which you don't want to copy / clone.



Use Cases / When you want to use this
-------------------------------------


### Single Page Applications (read: lots of JavaScript in your page!)

You have a Single Page Application of some complexity and you want to print all or just part(s) of the DOM without having to go through the effort of setting up a proper clone/copy in an iframe -- a job which can be particularly nasty when your content is largely JavaScript generated, e.g. large data grids, dynamic graphics such as D3-based graphs, etc.. 

It would be so good to have a little tool which would just hide and unhide the irrelevant parts of your current DOM while printing. 

Oh, and a Print Preview would be nice!



#### The Answer

Quite simple: use `jQuery.print-in-page` instead:


```javascript
var $your_selection = $('.collect-the-DOM-leaves-you-wish-to-print');
// set up the print environment, but do NOT execute it yet.
var pip_instance = $your_selection.print();

//...

// start the printing process:
pip_instance.continue();
```

and with a preview it goes something like this:

```javascript
var $your_selection = $('.collect-the-DOM-leaves-you-wish-to-print');
// set up the print environment, but do NOT execute it yet.
// Also hook into the post-preview to ensure we will wait for
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

        


### Your browser does not allow iframes nor popup windows

In highly secure and other restricted environments where iframes are frowned upon, the 'standard' ways to print a web page are not possible (as all methods rely on either the ability to create and fill an iframe or a popup window).

(Also note that any users who employ ad & popup blockers *very probably* not only nip any popups in the bud but also kill your iframes too, particularly when those blockers have been dialed up to aggressive protection levels. jQuery.print-in-page doesn't mind. In fact, we heartily encourage ad-blocking in your web pages!)




#### The Answer

Again, `jQuery.print-in-page` at your service! The example code above (see the first Use Case) merely applies a set of classes to your current DOM and that is it, really. It also invokes the standard browser print command (`window.print()`) at the appropriate time and offers a plethora of events where you can hook into the preview and print processes to further tweak your DOM. 

When all is done, the 'pip' classes are removed from the DOM again and the old situation is restored.

Easy as pie.

And no copying the DOM snapshot or otherwise into iframes or popups, hence less memory consumption by the brwoser too!




---




API
---

<dl>
<dt>$.fn.print(options)</dt>
  <dd>can be used to set the options shared among all 'print-in-page' instances, i.e. use this if you want to tweak the defaults.</dd>

<dt>$els.print(options)</dt>
  <dd>initializes a print-in-page instance for the given DOM node collection. Returns a reference to the print-in-page instance, so that you can chain print-in-page methods.</dd>
</dl>



### Options

You can override the class names applied by jQuery.print-in-page to accomplish the show/hide of the relevant DOM content. Here's the default set:

```javascript
{
  printLeafClass:         "pip-print",
  printParentClass:       "pip-print-parent",
  printRootClass:         "pip-print-root",
  notPrintedLeafClass:    "pip-do-not-print"
};
```

which you may override by specifying different class names in the `.print(options)` like this:

```javascript
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

```javascript
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

<dl>
  <dt>initPrinting</dt>
    <dd>triggered when you invoke the <code>.continue()</code> API method for the first time, starting a print process/session in your browser</dd>

  <dt>startPrintPreview</dt>
    <dd>...</dd>

  <dt>renderPrintPreview</dt>
    <dd>override the default here when you have specific render (DOM manipulation) needs which do not complement the default behaviour. See the [`javascripts/main.js`](javascripts/main.js) file for an example where a <strong>supplementary filtering process</strong> is applied in the <code>finishPrintPreview</code> event.</dd>

  <dt>finishPrintPreview</dt>
    <dd>Concludes the preview render/show process. By now we expect you to have your preview display in order and awaiting user ack/nack action.</dd>

  <dt>startPrint</dt>
    <dd>The actual printing process starts; if you need to perform some last-minute tweak, here's the place for that.</dd>

  <dt>renderPrint</dt>
    <dd>this phase is executing the actual <code>window.print()</code> call. Do not <code>e.preventDefault()</code> unless you wish to replace the actual printing process itself.</dd>

  <dt>finishPrint</dt>
    <dd>...</dd>

  <dt>startRollbackAfterPrint</dt>
    <dd>you receive this event when the printing process has completed (<a href="https://developer.mozilla.org/en-US/docs/Web/API/Window.onafterprint">onafterprint</a>) or has been aborted via the <code>.abort()</code> API method</dd>

  <dt>renderRollbackAfterPrint</dt>
    <dd>the default action following this event is to restore the DOM to its original glory from before the start of preview/print session</dd>

  <dt>finishRollbackAfterPrint</dt>
    <dd>...</dd>

  <dt>donePrinting</dt>
    <dd>this is the last event you will receive at the end of any and each print/preview session</dd>

  <dt>abortPrinting</dt>
    <dd>this event is fired when the <code>.abort()</code> API method has been invoked and the current print/preview process can be aborted.</dd>
</dl>




#### Notes about event handlers

When you have an event handler which includes some 'asynchronous code', e.g. the need to wait for the user to click a button, then the print/preview process can be halted at the given step until the async code finishes and can invoke the `.continue()` API method.

The second example in the **Use Cases** section above already hints how this is to be done:

- you must notify jQuery.print-in-page that the current event handler wants to wait for an async event to finish by flagging the event to 'stop propagation':

  ```javascript
pip_instance  
.on("finishPrintPreview", function (e) {
    // signal the system that it should NOT automatically 
    // call .continue() after we are done here:
    e.stopPropagation();
});
  ```

- the complement of this action is the need to manually invoke the `.continue()` method from the async event handler which we wanted to wait for, e.g.

  ```javascript
$('#preview-okay').click(function (e) {
  pip_instance.continue();        
});
  ```

The gist of this is that:

- every event is implicitly followed by a `.continue()` **unless** the event handler(s) flagged the event via [`event.stopPropagation()`](http://api.jquery.com/event.stoppropagation/)

- every event is implicitly followed by the 'default process' code **unless** the event handler(s) flagged the event via [`event.preventDefault()`](http://api.jquery.com/event.preventdefault/). 

  **Note** that this does not preclude the implicit execution of `.continue()`: both implicit actions are independent, as shown in this bit of jQuery.print-in-page internal code which takes care of these implicit activities:

  ```javascript
  if (!e.isDefaultPrevented() && exec_f) {
      // execute internal=default task
      exec_f.call(this, e);
  }
  if (!e.isPropagationStopped()) {
      this.continue();
  }
  ```

- when the user wishes to prevent further registered event handlers to execute for the current event, than she can flag the event with [`event.stopImmediatePropagation`](http://api.jquery.com/event.stopimmediatepropagation/) as is usual in event handlers.

- Also note that the `.abort()` API calls `.continue()` implicitly -- **after** triggering the `abortPrinting` event, so the above rules about implicit code execution after events applies, as usual.




### Methods

where <code><em>p</em></code> is the print-in-page instance obtained via the `$elements.print()` API:

<dl>
  <dt><code><em>p</em></code>.on(event, f)</dt>
    <dd>
    <p>register function <code>f</code> for the given event.</p>

    <blockquote>
    The handlers are executed in the order they are registered.
    </blockquote>

    <blockquote>
    <code>f</code> may be an <em>array</em> of handlers: each of these is then registered with the given event
    </blockquote>
  </dd>

  <dt><code><em>p</em></code>.off(event, f)</dt>
    <dd>
    <p>unregister function <code>f</code> for the given event.</p>

    <blockquote>
    <code>f</code> may be an <em>array</em> of handlers: each of these is then unregistered from the given event
    </blockquote>

    <blockquote>
    When you do not specify any handler (or <code>null</code>), then all registered handlers for this event are unregistered.
    </blockquote>

    <blockquote>
    When you do not specify an event, then the handler is unregistered for <em>all</em> events.
    </blockquote>
  </dd>

  <dt><code><em>p</em></code>.continue()</dt>
    <dd>
    <p>start / continue the print operation</p>
        
    <blockquote>
    <strong>Note</strong>: when invoked while the process is already commencing on its own, i.e. when called from an event handler during a <em>synchronous</em> action state, the call is simply ignored (the return value of the event handler is observed instead)
    </blockquote>
  </dd>


  <dt><code><em>p</em></code>.prime(N)</dt>
    <dd>prime the print operation for <em>N</em> <code>.continue()</code> invocations: use this method when you have multiple async processes running your event handler(s) and need <em>each and every one of them</em> to invoke <code>.continue()</code> before the print process may commence.
    </dd>


  <dt><code><em>p</em></code>.abort()</dt>
    <dd>
    <p>You can ABORT the print process at any time by invoking this method.</p>

    <blockquote>
    The DOM will be restored to its original pre-print-preview glory and the print process is reset.
    </blockquote>
  </dd>


  <dt><code><em>p</em></code>.isAborted()</dt>
    <dd>truthy when the current printing session is being aborted. This flag holds until the session ends (i.e. until after the `donePrinting` event).</dd>


  <dt><code><em>p</em></code>.isWorking()</dt>
    <dd>truthy when the print-in-page component is considered to be 'working' i.e. when it won't listen to <code>.continue()</code> calls as it's already moving along on its own volition</dd>


  <dt><code><em>p</em></code>.elements(<em>[$els]</em>)</dt>
    <dd>getter/setter for the set of DOM elements which will be print/previewed. You can change the DOM element collection until the preview starts (i.e. right before the <code>renderPrintPreview</code> event) and after the original situation has been restored (i.e. just before the <code>finishRollbackAfterPrint</code> event)</dd>


  <dt><code><em>p</em></code>.destroy()</dt>
    <dd>alias of <code>.teardown()</code></dd>

  <dt><code><em>p</em></code>.teardown()</dt>
    <dd>... <a href="http://learn.jquery.com/events/event-extensions/">jQuery teardown</a> ...</dd>
</dl>








---




Examples / Demos
----------------

See the `./demo` directory for [several examples](demo/index.html).

**Notes**:

- All demos use [RequireJS](http://requirejs.org/) to load the JavaScript assets.

- All demos share [a single JS driver file](javascripts/main.js).

- Check the differences in the HTML for the different examples in the `demo/` directory: these build upon one another from simple to complex, while the [`main.js`](javascripts/main.js) driver code serves them all.

- note that the [restyling demo](demo/restyling-and-printing.html) has been specifically tailored to make the actual printout **different from the preview**: by using extra print-media CSS rules and a few bits of DOM (HTML) the printout consists of multiple pages, while the preview is a single page, which does not include all the content in the lead-in page either. Check the example's HTML and CSS to observe what goes on in there.
  
