# Precision API Monitoring (PAPIM) Aggregation Calculator

# Description
A javascript calculator that aggregates service metrics per gateway and cluster for Precision API Monitoring (PAPIM).

## Short Description
A javascript calculator that aggregates service metrics per gateway and cluster for Precision API Monitoring.

## APM version
CA APM 10.5, CA APM 10.7, DX APM 20.1

## Supported third party versions
* CA Precision API Monitoring 3.4
* CA API Gateway 9.3 or later

## License
[Apache License v 2.0](LICENSE)

# Installation Instructions

## Prerequisites
1. Install CA API Gateway, CA APM and CA Precision API Monitoring according to the [documentation](https://techdocs.broadcom.com/#ca-enterprise-software).
2. **Important!** Before installing this aggregation calculator you **MUST** change the existing javascript calculator `apim.js`! As this calculator will create new aggregated metrics in the metric tree we must make sure that the out-of-the-box calculator does not copy the aggregated metrics but only the original metrics of the leaf nodes.
Replace the following code at the end of the file `<EM_HOME>/scripts/apim.js`
```
function getMetricRegex() {
    return ".*\\|Gateway\\|Services\\|.*";
}
```
with this
```
function getMetricRegex() {
    return ".*\\|Gateway\\|Services\\|.+\\]:.*";
}
```


## Dependencies
* CA APM 10.5, CA APM 10.7, DX APM 20.1
* CA Precision API Monitoring 3.4
* CA API Gateway 9.3 or later

## Configuration
For a single EM deployment use `PAPIM-Aggregation-single.js`, for a cluster deployment use `PAPIM-Aggregation-MOM.js` and `PAPIM-Aggregation-Collector.js`, respectively. `PAPIM-Aggregation-Collector.js` will aggregate service metrics in the PAPIM agents. `PAPIM-Aggregation-MOM.js`will create cluster metrics under `Custom Metric Host (Virtual)|...`. If you just need one of those two aggregations you can only deploy one file. `PAPIM-Aggregation-single.js` will do both.

Before installing the calculator you have to configure the script to match your environment. Open `PAPIM-Aggregation-single.js` or `PAPIM-Aggregation-MOM.js` in an editor (e.g. Notepad on Windows or vi on Linux).

1. If possible change the following regular expression at the top of `PAPIM-Aggregation-single.js` or `PAPIM-Aggregation-MOM.js` and `PAPIM-Aggregation-Collector.js` to match only the EPAgents in your environment that are handling Precision API Monitoring metrics. If in a cluster you need to configure this in both files. The fewer agents the expression matches the fewer resources are needed to run the calculator! Change this code:
```
// Step 1: define which agents to aggregate. Use smallest set possible!
function getAgentRegex() {
    return ".*\\|.*\\|.*";
}
```
E.g. if you have set the property `introscope.agent.customProcessName=PAPIM` in the `IntroscopeAgent.profile` of all your Precision API Monitoring agents change it to:
```
function getAgentRegex() {
    return ".*\\|PAPIM|EPAgent.*";
}
```
2. Configure your gateway clusters. This step is only needed for `PAPIM-Aggregation-single.js` and `PAPIM-Aggregation-MOM.js`. The calculator will aggregate metrics from one or more clusters of gateways. You have to configure your clusters by changing the following code near at the top to match your environment. In the script we have four clusters *black*, *white*, *odd* and *even*. A regex match is performed with the names of the gateways in the metric path of the PAPIM agents. A gateway may be part of multiple clusters.
```
// Step 2: define all your clusters here
var clusters = {
  "black" : [
    /atviegw\d+[1234]\.gg.broadcom.com/
  ],
  "white": [
    /atviegw\d+[56]\.gg.broadcom.com/
  ],
  "odd": [
    /atviegw\d+[13579]/
  ],
  "even": [
    /atviegw\d+[24680]/
  ]
};
```
3. If you want to have two messages logged to `IntroscopeEnterpriseManager.log` for every execution (every 15 seconds) set `var logSummary = true;`. The messages will log how many metrics matched the getAgentRegex() regex and were provided as input to the calculator and how many metrics were created by the calculator. See *Debugging and Troubleshooting* below. We recommend to set it to `false` after you have made sure that the calculator is running without any problems.
```
// Step 3: do you want a summary logged at every calculator execution (every 15 seconds?)
var logSummary = true;
```

## Installation
**Important!** Before installing this aggregation calculator you **MUST** change the existing javascript calculator `apim.js` as described under *Prerequisites* and configure `PAPIM-Aggregation.js` for your environment.

For a single EM deployment use `PAPIM-Aggregation-single.js`, for a cluster deployment use `PAPIM-Aggregation-MOM.js` and `PAPIM-Aggregation-Collector.js`, respectively.
If `introscope.enterprisemanager.javascript.hotdeploy.collectors.enable` in `<EM_HOME>/config/IntroscopeEnterpriseManager.properties` is set to `true` (which is the default), a script that is deployed on the MOM is automatically propagated to its collectors.

* If `introscope.enterprisemanager.javascript.hotdeploy.collectors.enable` is `false` you have to manually copy `PAPIM-Aggregation-Collector.js` to all collectors and `PAPIM-Aggregation-MOM.js` to the MOM.
* If `introscope.enterprisemanager.javascript.hotdeploy.collectors.enable` is `true` we recommend to set it to `false`. Save the file, wait for the value to propagate to `<EM_Home>\config\internal\server\scripts\JavaScriptCalculatorsMOM.properties` on the Collector and restart the MOM. Otherwise both scripts will be  copied to all collectors from the MOM. While the function `runOnMOM()` will prevent the collector script from running on the MOM, there is no such provision for collectors so both scripts woudl be executed on each collector.

To install copy the appropriate file to `<EM_HOME>/scripts/`.

The Introscope Enterprise Manager will read the new script file within 60 seconds and log the following messages to `IntroscopeEnterpriseManager.log`. If you see an error message you probably have a syntax error in the code you changed.
```
4/03/20 09:47:09.762 AM GMT [INFO] [TimerBean] [Manager.JavaScriptCalculator] Deploying JavaScript calculator /opt/CA/Introscope/./scripts/PAPIM-Aggregation-single.js
4/03/20 09:47:09.763 AM GMT [INFO] [TimerBean] [Manager.JavascriptEngine] Initializing script from /opt/CA/Introscope/./scripts/PAPIM-Aggregation-single.js
4/03/20 09:47:09.784 AM GMT [INFO] [TimerBean] [Manager.JavaScriptCalculator] Successfully added script /opt/CA/Introscope/./scripts/PAPIM-Aggregation-single.js
```

# Usage Instructions

## Metric description
All the metrics from each individual service will be aggregated at every level up to gateway. Gateway metrics will be aggregated into clusters as configured under `SuperDomain|Custom Metric Host (Virtual)|Custom Metric Process (Virtual)|Custom Metric Agent (Virtual)|API Gateway Cluster|<cluster>`

## Debugging and Troubleshooting
If you want to have two messages logged to `IntroscopeEnterpriseManager.log` for every execution (every 15 seconds) set `var logSummary = true;`. The log messages will look like these:
```
4/03/20 09:50:15.028 AM GMT [INFO] [master clock] [Manager.JavaScript|PAPIM-Aggregation-single.js] calculator PAPIM-Aggregation-single.js started with 390 metrics
4/03/20 09:50:15.042 AM GMT [INFO] [master clock] [Manager.JavaScript|PAPIM-Aggregation-single.js] calculator PAPIM-Aggregation-single.js created 840 metrics
```
Use the number of metrics in the *start* message to make sure you send as few metrics as possible to the calculator. You can also calculate the time the calculator ran, e.g. 14ms in the above example.

To debug the calculator you can set `var DEBUG = 1;` in `PAPIM-Aggregation-single.js`, `PAPIM-Aggregation-MOM.js` or `PAPIM-Aggregation-Collector.js`. This will log several messages per metric (!) to `IntroscopeEnterpriseManager.log` at log level DEBUG.

`DEBUG` is usually not configured for `IntroscopeEnterpriseManager.log` and you don't want to set the log level to `DEBUG` for the whole Enterprise Manager as it might have a performance impact. Therefore, we recommend to send the logs of the javascript calculator to a separate file by adding this log configuration to your `config/IntroscopeEnterpriseManager.properties`:
```
log4j.logger.Manager.JavaScript|PAPIM-Aggregation-single.js=DEBUG,jclogfile1
log4j.appender.jclogfile1.File=logs/PAPIM-Aggregation.js.log
log4j.appender.jclogfile1=com.wily.org.apache.log4j.RollingFileAppender
log4j.appender.jclogfile1.layout=com.wily.org.apache.log4j.PatternLayout
log4j.appender.jclogfile1.layout.ConversionPattern=%d{M/dd/yy hh:mm:ss.SSS a z} [%-3p] %m%n
log4j.appender.jclogfile1.MaxBackupIndex=4
log4j.appender.jclogfile1.MaxFileSize=10MB
```

## Support
This document and associated tools are made available from CA Technologies, A Broadcom Company as examples and provided at no charge as a courtesy to the CA APM Community at large. This resource may require modification for use in your environment. However, please note that this resource is not supported by CA Technologies, and inclusion in this site should not be construed to be an endorsement or recommendation by CA Technologies. These utilities are not covered by the CA Technologies software license agreement and there is no explicit or implied warranty from CA Technologies. They can be used and distributed freely amongst the CA APM Community, but not sold. As such, they are unsupported software, provided as is without warranty of any kind, express or implied, including but not limited to warranties of merchantability and fitness for a particular purpose. CA Technologies does not warrant that this resource will meet your requirements or that the operation of the resource will be uninterrupted or error free or that any defects will be corrected. The use of this resource implies that you understand and agree to the terms listed herein.

Although these utilities are unsupported, please let us know if you have any problems or questions by adding a comment to the CA APM Community Site area where the resource is located, so that the Author(s) may attempt to address the issue or question.

Unless explicitly stated otherwise this extension is only supported on the same platforms as the APM core agent. See [APM Compatibility Guide](https://techdocs.broadcom.com/us/product-content/status/compatibility-matrix/application-performance-management-compatibility-guide.html).

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
1.1 | CA Technologies | Added regex and multi-cluster support.
1.2 | CA Technologies | Split into collector and MOM scripts.
