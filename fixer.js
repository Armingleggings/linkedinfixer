// ==UserScript==
// @name         Linked in fixer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  LinkedIn lacks very basic features that would help so I'm going to write them myself.
// @author       Jeremy Duffy
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=glassdoor.com
// @grant        none
// @require https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    const badTitles = ['engineer','principal','director']; // lowercase titles you wouldn't want. Erase or add as needed
    const myStateCode = 'wa'; // Your state two letter code - lower case
    const badCompanies = ['coinbase','talentify'];
    const minWageHr = "72"; // SET TO 0 TO DISABLE THIS CHECK! hourly wage min - if it's listed and less then this, it gets culled
    const minWageYr = "150000"; // SET TO 0 TO DISABLE THIS CHECK! if it's listed and less than this, it gets culled.
    const testOnly = false; // when true, bad entries are dimmed and outlined in red instead of removed. Helpful if you worry that the script isn't working properly and will remove the wrong things. Change to "false" if you want to remove the entries instead

    function noGood(toTest){

        var testTitle = '';
        var testComp = '';
        var i;

        // Mark this so we don't constantly rehash it.
        // EDIT: nevermind. Details are added dynamically and the script misses them if it was pre-tagged as "done" before that operation finished
        // With no effective way to tell if Linked in is done loading information, we have to redo all visible options every time :(
        //$(toTest).addClass('fixChecked');

        testTitle = $(toTest).find('.job-card-list__title').text().toLowerCase().trim();
        if (testOnly) console.log('checking '+testTitle+'\n');
        if (!testTitle.length) return 0;

        for (i=0; i< badTitles.length; i++){
            if (testTitle.indexOf(badTitles[i]) != -1) {
                dumpJob(toTest,'Blacklisted title '+badTitles[i]);
                return 1;
            }
        }


        testComp = $(toTest).find('.artdeco-entity-lockup__subtitle').text().toLowerCase().trim();
        for (i=0; i< badCompanies.length; i++)
            if (testComp.indexOf(badCompanies[i]) != -1) {
                dumpJob(toTest,'Blacklisted company '+badCompanies[i]);
                return 1;
            }


        // If survived title, check location

        var city = null;
        var state = null;
        var remote = null;
        var company = null;
        var cityState = null;

        $(toTest).find('.job-card-container__metadata-item').each(function() {
            var jobItem = this;

            // Only check for this once. If we already resolved it, other fields aren't relevant for location
            if (!remote && !city) {
                remote = $(jobItem).text().toLowerCase().trim().match(/\((remote)\)/m);
                // If it's remote, we're good. Only check state if it's not
                if (!remote) {
                    cityState = $(jobItem).text().toLowerCase().trim().match(/^([a-z ]+), ([a-z]{2})$/m);
                    if (!cityState) // one more format to try
                        cityState = $(jobItem).text().toLowerCase().trim().match(/^([a-z ]+), ([a-z]{2})[^a-z]/m);
                    //console.log(cityState);
                    // We only test location if we recognized it's pattern. If we didn't, just leave it alone to be safe
                    if (cityState) {
                        city = cityState[1];
                        state = cityState[2];
                        if ((state && state != myStateCode)) {
                            dumpJob(toTest,'Not remote or in my state ('+myStateCode+' vs '+state+')');
                            return 1;
                        }
                    }
                }
            }

            if (minWageHr) {
                var thePay = 0;
                var payHr = $(jobItem).text().toLowerCase().trim().match(/\$(.+?)\/hr/g);
                if (payHr) {
                    // Last matching number is the high range. If solo, it will just be the wage
                    // Capture groups are ignored when using the global flag. so stupid...
                    thePay = payHr.pop().replace(/[\$\/hr]/g,'');
                    thePay = parseFloat(thePay);
                    if (thePay < minWageHr) {
                        dumpJob(toTest,"Hourly too low! Desired: "+minWageHr+" vs actual: "+thePay);
                        return 1;
                    }
                }
            }
            if (minWageYr) {
                var payYr = $(jobItem).text().toLowerCase().trim().match(/\$(.+?k?)\/yr/g);
                var temp;
                if (payYr) {
                    // Last matching number is the high range. If solo, it will just be the wage
                    // Capture groups are ignored when using the global flag. so stupid...
                    thePay = payYr.pop().replace(/[\$\/yr]/gi,'');
                    if (thePay.indexOf('k')!=-1) {
                        thePay = thePay.replace('k','');
                        thePay = parseFloat(thePay)*1000;
                    }
                    else
                        thePay = parseFloat(thePay);
                    console.log(thePay);
                    if (thePay < minWageYr) {
                        dumpJob(toTest,"Yearly too low! Desired: "+minWageYr+" vs actual: "+thePay);
                        return 1;
                    }
                }
            }
        });

        return 0;
    }
    // In a function to more easily switch between testing and actual removing.
    function dumpJob(toDump,reason) {
        var title = $(toDump).find('.job-card-list__title').text().toLowerCase().trim();
        console.log('Dumping '+title+'\n::Reason: '+reason);
        if (testOnly) {
            // no sense in dumping it twice.
            if (!$(toDump).hasClass('ddisabled'))
                $(toDump).addClass('ddisabled').append('Removal reason: '+reason); // For testing - just make it smaller and hard to see
        }
        else {
            $(toDump).addClass('rremoved');
            var grabLink = $(toDump).find('.job-card-container__link');
            $(toDump).html('Dumping '+grabLink[0].outerHTML+'<br>Removal reason: '+reason); // For real, just get rid of it!
        }
    }

    $(document).ready(function(){

        $("body").append(`

        <style>

        .ddisabled {
            opacity: .5;
            border: 1px solid red;
        }
        .rremoved {
            font-size: 11px;
            padding: 10px !important;
            border: 1px solid rgba(8,8,8,.35);
        }
        </style>
        `);

        function fixLinkedIn(){
            //if (testOnly) console.log('fixing');
            $(document).find('.jobs-search-results__list-item').each(function(){
                // Check for my custom class so we're not thrashing on the same stuff we already checked
                if ($(this).hasClass('fixChecked')) return;
                noGood(this);
            });
        }

        var jobCatcher;
        var scrollT;
        jobCatcher = setInterval(function(){
            $('.jobs-search-results-list').each(function(){
				// We've already dealt with this one
				if ($(this).hasClass('scrollFixer')) return;
				if ($(document).find('.jobs-search-results__list-item').length) {
					//if (testOnly) console.log('attaching');
					// Do it for the first set of things on screen
                    // but there's a race condition because there's no way to know when the dynamic data is loaded. ugh... who designs this way?
                    setTimeout(function(){fixLinkedIn();},200);
					// Attach scroll event
					$('.jobs-search-results-list').on('scroll',function(){
						// Scroll is called mutliple times in a single scrolling event
						// Prevent it from overcalling the fixer by killing any pending calls
						clearTimeout(scrollT);
						// Set a new call. Eventually, if this is the last one and scroll isn't called again, it will launch the fixer function
						scrollT = setTimeout(function(){
                            fixLinkedIn();
                            if (!testOnly)
                                // The act of removing entries makes some others come into view that weren't there before.
                                // Run it again to catch those.
                                setTimeout(function(){fixLinkedIn();},1000);

                        },100);
					});
				}
				// Mark it as done
				$(this).addClass('scrollFixer');
            });
        },2000);
    });

})();
