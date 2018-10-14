"use strict";
/*global phantom: false*/

var webpage = require("webpage");
var system = require("system");

function convert(source, dest, width, height) {
    var page = webpage.create();
    page.clipRect = { top: 0, left: 0, width: width, height: height };
    page.open(source, function (status) {
        if (status !== "success") {
            console.error('Status: ' + status);
            phantom.exit(1);
        }
        page.render(dest, { format: 'png' });
        phantom.exit(0);
    });
}

// arg[0] is the js file
if (system.args.length !== 5) {
    console.error('Error: need source, dest, width, height');
    phantom.exit(1);
} else {
    convert(system.args[1], system.args[2], system.args[3]*1, system.args[4]*1);
}
