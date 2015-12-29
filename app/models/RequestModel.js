/**
 * Created by jbucca on 12/28/15.
 */

module.exports = {
  fields : {
    "originIp": "text",
    "path": "text",
    "timestamp": "text",
    "targetIp": "text",
    "method": "text",
    "responseTime": "int"
  },
  key: ["originIp", "path", "timestamp"]
};
