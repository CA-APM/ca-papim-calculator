// Step 1: define which agents to aggregate. Use smallest set possible!
function getAgentRegex() {
    return ".*\\|.*\\|.*";
}

function execute(metricData, javascriptResultSetHelper) {

    // Step 2: do you want a summary logged at every calculator execution (every 15 seconds?)
    var logSummary = true;

    // set to 1 to log debug messages at level INFO into IntroscopeEnterpriseManager.log
    var DEBUG = 0;

    // DO NOT CHANGE BELOW!!!

    var CLUSTER = "-1";
    var GATEWAY = "1";
    var SERVICE = "3";
    var SUB_SERVICE = "4";

    var createdCount = 0;

    // Needed to calculate Aggregated metric values for agents
    var frontendValueMap = {};
    var frontendCountValueMap = {};
    var frontendMinValueMap = {};
    var frontendMaxValueMap = {};

    var backendValueMap = {};
    var backendCountValueMap = {};
    var backendMinValueMap = {};
    var backendMaxValueMap = {};

    var otherMetricMap = {};

    var gatewayString = "|Gateway|Services|";

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

        var newMetricPath = agent;

        for (j = 0; j < tokens.length; ++j) {

          // build new metric path by adding next token
          newMetricPath = newMetricPath + "\|" + tokens[j];

          var newMetricName = newMetricPath + metricName;
          if (DEBUG) {
            log.debug("newMetricName: " + newMetricName + ", j: " + j);
          }

          // for weighted ART we need both value and count
          if (metricName.endsWith(":Front End Average Response Time (ms)") ) {
            // for all but the metric name itself
            if (j < tokens.length-1) {
              if (frontendValueMap[newMetricName] == null) {
                frontendValueMap[newMetricName] = value * count;
                frontendCountValueMap[newMetricName] = count;
                frontendMinValueMap[newMetricName] = min;
                frontendMaxValueMap[newMetricName] = max;
              } else {
                frontendValueMap[newMetricName] = value * count + frontendValueMap[newMetricName];
                frontendCountValueMap[newMetricName] = count + frontendCountValueMap[newMetricName];
                if (min < frontendMinValueMap[newMetricName]) { frontendMinValueMap[newMetricName] = min; }
                if (max > frontendMaxValueMap[newMetricName]) { frontendMaxValueMap[newMetricName] = max; }
              }

              if (DEBUG) {
                log.debug("  FE ART * Count = " + frontendValueMap[newMetricName]
                  + ", FE Count = " + frontendCountValueMap[newMetricName]
                  + ", FE Min" + frontendMinValueMap[newMetricName]
                  + ", FE Max" + frontendMaxValueMap[newMetricName]);
                }
            }

          } else if (metricName.endsWith(":Back End Average Response Time (ms)") ) {
            // for all but the metric name itself
            if (j < tokens.length-1) {
              if (backendValueMap[newMetricName] == null) {
                backendValueMap[newMetricName] = value * count;
                backendCountValueMap[newMetricName] = count;
                backendMinValueMap[newMetricName] = min;
                backendMaxValueMap[newMetricName] = max;
              } else {
                backendValueMap[newMetricName] = value * count + backendValueMap[newMetricName];
                backendCountValueMap[newMetricName] = count + backendCountValueMap[newMetricName];
                if (min < backendMinValueMap[newMetricName]) { backendMinValueMap[newMetricName] = min; }
                if (max > backendMaxValueMap[newMetricName]) { backendMaxValueMap[newMetricName] = max; }
              }

              if (DEBUG) {
                log.debug("  BE ART * Count = " + backendValueMap[newMetricName]
                  + ", BE Count = " + backendCountValueMap[newMetricName]
                  + ", BE Min" + backendMinValueMap[newMetricName]
                  + ", BE Max" + backendMaxValueMap[newMetricName]);
              }
            }

          } else {
            // for all but the metric name itself
            if (j < tokens.length-1) {
              if (otherMetricMap[newMetricName] == null) {
                otherMetricMap[newMetricName] = value;
              } else {
                otherMetricMap[newMetricName] = value + otherMetricMap[newMetricName];
              }

              if (DEBUG) { log.debug("  " + newMetricName + " = " + otherMetricMap[newMetricName]); }
            }
          }
        }
    }

    var metricValue = 0;

    // now do the final calculation by dividing by count and create new metrics
    for (var frontendMetric in frontendValueMap) {
        if (frontendMetric.indexOf("Average Response Time (ms)") > 0 && frontendValueMap[frontendMetric] > 0){
            metricValue = frontendValueMap[frontendMetric]/frontendCountValueMap[frontendMetric];
        }
        else{
            metricValue = frontendValueMap[frontendMetric];
        }

        if (DEBUG) { log.debug("    creating metric " + frontendMetric + " = " + metricValue); }
        javascriptResultSetHelper.addMetric(frontendMetric,
          frontendCountValueMap[frontendMetric],
          metricValue,
          frontendMinValueMap[frontendMetric],
          frontendMaxValueMap[frontendMetric],
          Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerDuration,
				  frequency);
        createdCount++;
    }

    for (var backendMetric in backendValueMap) {
        if (backendMetric.indexOf("Average Response Time (ms)") > 0 && backendValueMap[backendMetric] > 0){
            metricValue = backendValueMap[backendMetric]/backendCountValueMap[backendMetric];
        }
        else {
            metricValue = backendValueMap[backendMetric];
        }

        if (DEBUG) { log.debug("    creating metric " + backendMetric + " = " + metricValue); }
        javascriptResultSetHelper.addMetric(backendMetric,
          backendCountValueMap[backendMetric],
          metricValue,
          backendMinValueMap[backendMetric],
          backendMaxValueMap[backendMetric],
          Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerDuration,
				  frequency);
        createdCount++;
    }

    for (var otherMetric in otherMetricMap) {
        if (DEBUG) { log.debug("    creating metric " + otherMetric + " = " + otherMetricMap[otherMetric]); }
        javascriptResultSetHelper.addMetric(otherMetric,
          otherMetricMap[otherMetric],
          otherMetricMap[otherMetric],
          otherMetricMap[otherMetric],
          otherMetricMap[otherMetric],
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

// return false if the script should not run on the MOM
// default is true.
function runOnMOM()
{
   return false;
}
