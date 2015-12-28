/**
 * Created by jbucca on 12/28/15.
 */

module.exports = {
  fields : {
    "originIp": "text",
    "path": "text",
    "times": "counter"
  },
  key: ["originIp", "path"]
};
