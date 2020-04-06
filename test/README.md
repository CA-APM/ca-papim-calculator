# Precision API Monitoring (PAPIM) Aggregation Calculator Test Data

# Description
This directory contains a Thunderloader scenario that generates test data for the calculator.

## APM version
CA APM 10.5, CA APM 10.7, DX APM 20.1

## Supported third party versions
[Thunderloader](https://cawiki.ca.com/display/SASWAT/Thunder+Loader).

# Installation Instructions

## Prerequisites
Install [Thunderloader](https://cawiki.ca.com/display/SASWAT/Thunder+Loader).

## Configuration
Create a zip file from the PAPIMScenario directory and import it into Thunderloader as Storm scenario. Then run the scenario.
On MacOS use `zip -r PAPIMScenario.zip PAPIMScenario/* -x "*.DS_Store" -x "__MACOSX"` from the command line to create the zip without the Mac specific hidden files.

### Support URL
https://github.com/CA-APM/ca-papim-calculator/issues

# Contributing
The [DX APM Community](https://community.broadcom.com/enterprisesoftware/communities/communityhomeblogs?CommunityKey=be08e336-5d32-4176-96fe-a778ffe72115) is the primary means of interfacing with other users and with the CA APM product team.

If you wish to contribute to this or any other project, check us out on [GitHub](https://github.com/CA-APM) or in the [DX APM Community](https://community.broadcom.com/enterprisesoftware/communities/communityhomeblogs?CommunityKey=be08e336-5d32-4176-96fe-a778ffe72115).

## Categories
Integration


# Change log
Changes for each version of the extension.

Version | Author | Comment
--------|--------|--------
1.0 | CA Technologies | First version of the extension.
1.1 | CA Technologies | Added Thunderloader test data.
