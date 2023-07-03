# LinkedIn Fixer
Bottom line, it got pretty tiring having my attention taken by jobs that I clearly didn't want or qualify for, paid too little, or weren't in my area (or remote). It's mystifying that LinkedIn doesn't already filter these or give us any control over them so I stopped waiting and just did it myself. 

This script is designed to drop into TamperMonkey and will live scrape and clean up LinkedIn results based on the variable set at the top:

    const badTitles = ['engineer','principal','director']; // lowercase titles you wouldn't want. Erase or add as needed
    const myStateCode = 'wa'; // Your state two letter code - lower case
    const badCompanies = ['coinbase','talentify'];
    const minWageHr = "72"; // SET TO 0 TO DISABLE THIS CHECK! hourly wage min - if it's listed and less then this, it gets culled
    const minWageYr = "150000"; // SET TO 0 TO DISABLE THIS CHECK! if it's listed and less than this, it gets culled.
