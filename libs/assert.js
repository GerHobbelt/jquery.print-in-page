// Uses Node, AMD or browser globals to create a module. (UMD template)

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
            return (root.assert = factory(root));
        });
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(root);
    } else {
        // Browser globals
        root.assert = factory(root);
    }
}(this, function (root) {

    // Note: jQuery appears to have their own assert(), but that one is located in their own private scope so we're fine.

    // Note: assert()ions do NOT jump into the debugger but signal failure through throwing an exception when they happen to be triggered inside a Jasmine Test Suite run:
    //var unit_tests_exec_state;              // 1: running, 2: completed, 3: never executed and never will (just another kind of 'completed')

    function assert(expr, msg) {
        if (!expr) {
            msg = Array.prototype.slice.call(arguments, 1).join(" ").trim();
            if (console && console.log) {
                console.log("@@@@@@ assertion failed: ", arguments, (msg || ""));
            }
            if (!root || root.unit_tests_exec_state === 1) {
                throw new Error("ASSERTION failed" + (msg ? ": " + msg : ""));
            } else if (root && root.invoke_debugger !== false) {
                debugger;
            }
        }
        return !!expr;
    }


    return assert;
}));




