// Step 1: define which agents to aggregate. Use smallest set possible!
function getAgentRegex() {
    return ".*\\|.*\\|.*";
}

function execute(metricData, javascriptResultSetHelper) {

    // Step 2: define all your clusters here
    var clusters = {
      "black" : [
        /atviegw\d+[1234]\.gg.broadcom.com/
      ],
      "white": [
        /atviegw\d+[56]\.gg.broadcom.com/
      ],
      "odd": [
        /atviegw\d+[13579]\.gg.broadcom.com/
      ],
      "even": [
        /atviegw\d+[24680]\.gg.broadcom.com/
      ]
    };

    // Step 3: do you want a summary logged at every calculator execution (every 15 seconds?)
    var logSummary = true;

    // set to 1 to log debug messages at level INFO into IntroscopeEnterpriseManager.log
    var DEBUG = 0;

    // DO NOT CHANGE BELOW!!!

    var CLUSTER = "-1";
    var GATEWAY = "1";
    var SERVICE = "3";
    var SUB_SERVICE = "4";

    // define the aggregation name
    var CLUSTER_PREFIX = "SuperDomain|Custom Metric Host (Virtual)|Custom Metric Process (Virtual)|Custom Metric Agent (Virtual)|API Gateway Cluster|";
    var createdCount = 0;

    // Needed to calculate Aggregated metric values only for clusters under CLUSTER_PREFIX
    var clusterFrontendValueMap = {};
    var clusterFrontendCountValueMap = {};
    var clusterFrontendMinValueMap = {};
    var clusterFrontendMaxValueMap = {};

    var clusterBackendValueMap = {};
    var clusterBackendCountValueMap = {};
    var clusterBackendMinValueMap = {};
    var clusterBackendMaxValueMap = {};

    var clusterOtherMetricMap = {};

    var gatewayString = "|Gateway|Services|";
    var runningOnMOM = false;

    if (logSummary) {
      log.info("calculator PAPIM-Aggregation.js started with " + metricData.length + " metrics");
    }

    // for every matching metric
    for (i = 0; i < metricData.length; i++) {

        // get metric path
        var metric = metricData[i].agentMetric.attributeURL;
        //log.debug("init " + metric);
        //log.debug("metricData[i].agentName: " + metricData[i].agentName);
        var agent = metricData[i].agentName.processURL;

        // filter metrics even more
        if (agent.indexOf("Custom Metric Host") > -1
            || metricData[i].dataIsAbsent
            || metric.indexOf("Variance") > -1
            || metric.indexOf("size") > -1) {
            // watch out for dead EPAgents and their metrics,
            // which will cause exceptions about re-defining metrics below
            continue;
        }

        var indexOfGatewayServices = metric.indexOf(gatewayString);
        if (indexOfGatewayServices == -1) {
            //Check for valid APIM metric before processing
            continue;
        }

        var value = metricData[i].timeslicedValue.value;
        var min = metricData[i].timeslicedValue.getMinimumAsLong();
        var max = metricData[i].timeslicedValue.getMaximumAsLong();
        var count = metricData[i].timeslicedValue.dataPointCount;
        var frequency = metricData[i].frequency;
        var gateway = metric.substring(0, indexOfGatewayServices);

        if (DEBUG) { log.debug("init " + metric + " = " + value + ", gateway = " + gateway); }

        // split by path and metric name
        var colonIndex = metric.indexOf(":");
        var tokens = metric.substring(0, colonIndex).split("\\|");
        var metricName = metric.substring(colonIndex);

        // log.debug("found " + tokens.length + " tokens, metricName = " + metricName);

        var clusterMetricPaths = [];
        var writeCluster = false;

        for (var clusterName in clusters) {
          for (var clusterIndex = 0; clusterIndex < clusters[clusterName].length; clusterIndex++) {
            if (clusters[clusterName][clusterIndex].test(gateway)) {
              clusterMetricPaths.push(CLUSTER_PREFIX + clusterName);
              writeCluster = true;
              if (DEBUG) { log.debug("   gateway = " + gateway + " found in cluster " + clusterName); }
              break;
            }
          }
        }


        for (j = 0; j < tokens.length; ++j) {

          // build new metric path by adding next token
          if (j > GATEWAY) {
            // no gateway in cluster metric path!
            // if token == 'gateway' append directly to cluster name
            for (var k = 0; k < clusterMetricPaths.length; ++k) {
              clusterMetricPaths[k] = clusterMetricPaths[k] + "\|" + tokens[j];
            }
          }

          // for weighted ART we need both value and count
          if (metricName.endsWith(":Front End Average Response Time (ms)") ) {
            // now also for cluster
            if (writeCluster && (j >= GATEWAY)) {
              for (var k = 0; k < clusterMetricPaths.length; ++k) {
                var clusterMetricName = clusterMetricPaths[k] + metricName;

                if (clusterFrontendValueMap[clusterMetricName] == null) {
                  clusterFrontendValueMap[clusterMetricName] = value * count;
                  clusterFrontendCountValueMap[clusterMetricName] = count;
                  clusterFrontendMinValueMap[clusterMetricName] = min;
                  clusterFrontendMaxValueMap[clusterMetricName] = max;
                } else {
                  clusterFrontendValueMap[clusterMetricName] = value * count + clusterFrontendValueMap[clusterMetricName];
                  clusterFrontendCountValueMap[clusterMetricName] = count + clusterFrontendCountValueMap[clusterMetricName];
                  if (min < clusterFrontendMinValueMap[clusterMetricName]) { clusterFrontendMinValueMap[clusterMetricName] = min; }
                  if (max > clusterFrontendMaxValueMap[clusterMetricName]) { clusterFrontendMaxValueMap[clusterMetricName] = max; }
                }

                if (DEBUG) {
                  log.debug("  Cluster FE ART * Count = " + clusterFrontendValueMap[clusterMetricName]
                    + ", Cluster FE Count = " + clusterFrontendCountValueMap[clusterMetricName]
                    + ", Cluster FE Min" + clusterFrontendMinValueMap[clusterMetricName]
                    + ", Cluster FE Max" + clusterFrontendMaxValueMap[clusterMetricName]);
                }
              }
            }
          } else if (metricName.endsWith(":Back End Average Response Time (ms)") ) {
            // now also for cluster
            if (writeCluster && (j >= GATEWAY)) {
              for (var k = 0; k < clusterMetricPaths.length; ++k) {
                var clusterMetricName = clusterMetricPaths[k] + metricName;

                if (clusterBackendValueMap[clusterMetricName] == null) {
                  clusterBackendValueMap[clusterMetricName] = value * count;
                  clusterBackendCountValueMap[clusterMetricName] = count;
                  clusterBackendMinValueMap[clusterMetricName] = min;
                  clusterBackendMaxValueMap[clusterMetricName] = max;
                } else {
                  clusterBackendValueMap[clusterMetricName] = value * count + clusterBackendValueMap[clusterMetricName];
                  clusterBackendCountValueMap[clusterMetricName] = count + clusterBackendCountValueMap[clusterMetricName];
                  if (min < clusterBackendMinValueMap[clusterMetricName]) { clusterBackendMinValueMap[clusterMetricName] = min; }
                  if (max > clusterBackendMaxValueMap[clusterMetricName]) { clusterBackendMaxValueMap[clusterMetricName] = max; }
                }

                if (DEBUG) {
                  log.debug("  BE ART * Count = " + clusterBackendValueMap[clusterMetricName]
                    + ", BE Count = " + clusterBackendCountValueMap[clusterMetricName]
                    + ", BE Min" + clusterBackendMinValueMap[clusterMetricName]
                    + ", BE Max" + clusterBackendMaxValueMap[clusterMetricName]);
                }
              }
            }
          } else {
            // now also for cluster
            if (writeCluster && (j >= GATEWAY)) {
              for (var k = 0; k < clusterMetricPaths.length; ++k) {
                var clusterMetricName = clusterMetricPaths[k] + metricName;

                if (clusterOtherMetricMap[clusterMetricName] == null) {
                  clusterOtherMetricMap[clusterMetricName] = value;
                } else {
                  clusterOtherMetricMap[clusterMetricName] = value + clusterOtherMetricMap[clusterMetricName];
                }
                if (DEBUG) { log.debug("  " + clusterMetricName + " = " + clusterOtherMetricMap[clusterMetricName]); }
              }
            }
          }
        }
    }

    var metricValue = 0;

    // now do the final calculation by dividing by count and create new metrics
    for (var clusterFrontendMetric in clusterFrontendValueMap) {
        if (clusterFrontendMetric.indexOf("Average Response Time (ms)") > 0 && clusterFrontendValueMap[clusterFrontendMetric] > 0){
            metricValue = clusterFrontendValueMap[clusterFrontendMetric]/clusterFrontendCountValueMap[clusterFrontendMetric];
        }
        else{
            metricValue = clusterFrontendValueMap[clusterFrontendMetric];
        }

        if (DEBUG) { log.debug("    creating metric " + clusterFrontendMetric + " = " + metricValue); }
        javascriptResultSetHelper.addMetric(clusterFrontendMetric,
          clusterFrontendCountValueMap[clusterFrontendMetric],
          metricValue,
          clusterFrontendMinValueMap[clusterFrontendMetric],
          clusterFrontendMaxValueMap[clusterFrontendMetric],
          Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerDuration,
				  frequency);
        createdCount++;
    }

    for (var clusterBackendMetric in clusterBackendValueMap) {
        if (clusterBackendMetric.indexOf("Average Response Time (ms)") > 0 && clusterBackendValueMap[clusterBackendMetric] > 0){
            metricValue = clusterBackendValueMap[clusterBackendMetric]/clusterBackendCountValueMap[clusterBackendMetric];
        }
        else{
            metricValue = clusterBackendValueMap[clusterBackendMetric];
        }

        if (DEBUG) { log.debug("    creating metric " + clusterBackendMetric + " = " + metricValue); }
        javascriptResultSetHelper.addMetric(clusterBackendMetric,
          clusterBackendCountValueMap[clusterBackendMetric],
          metricValue,
          clusterBackendMinValueMap[clusterBackendMetric],
          clusterBackendMaxValueMap[clusterBackendMetric],
          Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerDuration,
				  frequency);
        createdCount++;
    }

    for (var clusterOtherMetric in clusterOtherMetricMap) {
        if (DEBUG) { log.debug("    creating metric " + clusterOtherMetric + " = " + clusterOtherMetricMap[clusterOtherMetric]); }
          javascriptResultSetHelper.addMetric(clusterOtherMetric,
            clusterOtherMetricMap[clusterOtherMetric],
            clusterOtherMetricMap[clusterOtherMetric],
            clusterOtherMetricMap[clusterOtherMetric],
            clusterOtherMetricMap[clusterOtherMetric],
            Packages.com.wily.introscope.spec.metric.MetricTypes.kLongFluctuatingCounter,
            frequency);
          createdCount++;
    }

    if (logSummary) {
      log.info("calculator PAPIM-Aggregation.js created " + createdCount + " metrics");
    }

    return javascriptResultSetHelper;
}

// define which metrics to aggregate. DO NOT CHANGE!
function getMetricRegex() {
    // get only leaf, not aggregated metrics
    return ".*\\|Gateway\\|Services\\|.+\\]:.*";
}
