function execute(metricData, javascriptResultSetHelper) {

    var CLUSTER = "-1";
    var GATEWAY = "1";
    var SERVICE = "3";
    var SUB_SERVICE = "4";

    // define at which levels to aggregate
    var AGGREGATION_LEVELS = [CLUSTER, GATEWAY, SERVICE];


    var CLUSTER_PREFIX = "Cluster";
    var createdCount = 0;

    var backendMetricPath = "";
    var frontendMetricPath = "";

    // Needed to calculate Aggregated metric values

    var frontendValueMap = {};
    var frontendCountValueMap = {};
    var frontendMinValueMap = {};
    var frontendMaxValueMap = {};

    var backendValueMap = {};
    var backendCountValueMap = {};
    var backendMinValueMap = {};
    var backendMaxValueMap = {};

    var otherMetricMap = {};
    var agentMap = {};

    var gatewayString = "|Gateway|Services|";

    // do we really need to do this?
    if (AGGREGATION_LEVELS.length == 0) {
      return javascriptResultSetHelper;
    }

    // for every matching metric
    for (i = 0; i < metricData.length; i++) {

        // get metric path
        var metric = metricData[i].agentMetric.attributeURL;
        //log.info("init " + metric);
        //log.info("metricData[i].agentName: " + metricData[i].agentName);
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

        log.info("init " + metric + " = " + value);

        // split by path and metric name
        var colonIndex = metric.indexOf(":");
        var tokens = metric.substring(0, colonIndex).split("\\|");
        var metricName = metric.substring(colonIndex);

        // log.info("found " + tokens.length + " tokens, metricName = " + metricName);

        var newMetricPath = agent;
        // for all but the metric name itself
        for (j = CLUSTER; j < tokens.length-1; ++j) {

          // build new metric path by adding next token
          if (j == CLUSTER) {
            agentMap[agent] = agent;
            newMetricPath = CLUSTER_PREFIX;
          } else {
            newMetricPath = newMetricPath + "\|" + tokens[j];
          }

          // only aggregate at selected levels
          var found = false;
          for (var k = 0; k < AGGREGATION_LEVELS.length; ++k) {
            if (j == AGGREGATION_LEVELS[k]) {
              found = true;
              break;
            }
          }
          if (!found) {
            continue;
          }

          var newMetricName = newMetricPath + metricName;
          log.info("newMetricName: " + newMetricName);

          // for weighted ART we need both value and count
          if (metricName.endsWith(":Front End Average Response Time (ms)") ) {
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

            log.info("  FE ART * Count = " + frontendValueMap[newMetricName]
                + "  FE Count = " + frontendCountValueMap[newMetricName]
                + "  FE Min" + frontendMinValueMap[newMetricName]
                + "  FE Max" + frontendMaxValueMap[newMetricName]);
          } else if (metricName.endsWith(":Back End Average Response Time (ms)") ) {
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

            log.info("  BE ART * Count = " + backendValueMap[newMetricName]
                + "  BE Count = " + backendCountValueMap[newMetricName]
                + "  BE Min" + backendMinValueMap[newMetricName]
                + "  BE Max" + backendMaxValueMap[newMetricName]);
          } else {
            if (otherMetricMap[newMetricName] == null) {
              otherMetricMap[newMetricName] = value;
            } else {
              otherMetricMap[newMetricName] = value + otherMetricMap[newMetricName];
            }

            log.info("  " + metricName + " = " + otherMetricMap[newMetricName]);
          }

          if (j == CLUSTER) {
            // restore metric path
            newMetricPath = agent;
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

        if (frontendMetric.indexOf(CLUSTER_PREFIX) == 0) {
            // add cluster metrics to all agents
            for (var agent in agentMap) {
              log.info("    creating metric " + agent + "\|" + frontendMetric + " = " + metricValue);
              javascriptResultSetHelper.addMetric(agent + "\|" + frontendMetric,
                frontendCountValueMap[frontendMetric],
                metricValue,
                frontendMinValueMap[frontendMetric],
                frontendMaxValueMap[frontendMetric],
                Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerPercentage,
      				  frequency);
            }
        } else {
          log.info("    creating metric " + frontendMetric + " = " + metricValue);
          javascriptResultSetHelper.addMetric(frontendMetric,
            frontendCountValueMap[frontendMetric],
            metricValue,
            frontendMinValueMap[frontendMetric],
            frontendMaxValueMap[frontendMetric],
            Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerPercentage,
  				  frequency);
        }
    }

    for (var backendMetric in backendValueMap) {
        if (backendMetric.indexOf("Average Response Time (ms)") > 0 && backendValueMap[backendMetric] > 0){
            metricValue = backendValueMap[backendMetric]/backendCountValueMap[backendMetric];
        }
        else {
            metricValue = backendValueMap[backendMetric];
        }

        if (backendMetric.indexOf(CLUSTER_PREFIX) == 0) {
            // add cluster metrics to all agents
            for (var agent in agentMap) {
              log.info("    creating metric " + agent + "\|" + backendMetric + " = " + metricValue);
              javascriptResultSetHelper.addMetric(agent + "\|" + backendMetric,
                backendCountValueMap[backendMetric],
                metricValue,
                backendMinValueMap[backendMetric],
                backendMaxValueMap[backendMetric],
                Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerPercentage,
                frequency);
            }
        } else {
          log.info("    creating metric " + backendMetric + " = " + metricValue);
          javascriptResultSetHelper.addMetric(backendMetric,
            backendCountValueMap[backendMetric],
            metricValue,
            backendMinValueMap[backendMetric],
            backendMaxValueMap[backendMetric],
            Packages.com.wily.introscope.spec.metric.MetricTypes.kIntegerPercentage,
  				  frequency);
        }
    }

    for (var otherMetric in otherMetricMap) {
      if (otherMetric.indexOf(CLUSTER_PREFIX) == 0) {
          // add cluster metrics to all agents
          for (var agent in agentMap) {
            log.info("    creating metric " + agent + "\|" + otherMetric + " = " + otherMetricMap[otherMetric]);
            javascriptResultSetHelper.addMetric(agent + "\|" + otherMetric,
              otherMetricMap[otherMetric],
              otherMetricMap[otherMetric],
              otherMetricMap[otherMetric],
              otherMetricMap[otherMetric],
              Packages.com.wily.introscope.spec.metric.MetricTypes.kLongFluctuatingCounter,
              frequency);
          }
      } else {
        log.info("    creating metric " + otherMetric + " = " + otherMetricMap[otherMetric]);
          javascriptResultSetHelper.addMetric(otherMetric,
            otherMetricMap[otherMetric],
            otherMetricMap[otherMetric],
            otherMetricMap[otherMetric],
            otherMetricMap[otherMetric],
            Packages.com.wily.introscope.spec.metric.MetricTypes.kLongFluctuatingCounter,
            frequency);
      }
    }

    return javascriptResultSetHelper;
}

function getMetricRegex() {
    // get only leaf, not aggregated metrics
    return ".*\\|Gateway\\|Services\\|.+\\]:.*";
}

function getAgentRegex() {
    return ".*";
}
