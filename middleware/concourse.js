const fetch = require("isomorphic-fetch")
const apiUrl = 'http://appsmanager.ci.cf-app.com/api/v1';
const baseOptions = {
	headers: {
		accept: 'application/json',
		'content-type': 'application/json',
		Cookie: 'ATC-Authorization=Basic cGl2b3RhbGNmOnJpY2h3aW50ZXIyOQ=='
	}
};



exports.fetchPipelines = function() {
	return fetch(`${apiUrl}/pipelines`, baseOptions);
}

exports.fetchJobs = function(pipelineName) {
	return fetch(`${apiUrl}/pipelines/${pipelineName}/jobs`, baseOptions); 
}

exports.fetchResources = function(pipelineName) {
	return fetch(`${apiUrl}/pipelines/${pipelineName}/resources`, baseOptions); 
}

exports.fetchBuilds = function() {
	return fetch('${apiUrl}/builds', baseOptions);  
}

// Job build endpoints
exports.fetchBuild = function(buildId) {
	return fetch('${apiUrl}/builds/${buildId}', baseOptions);
}

exports.fetchBuildPreparation = function(buildId) {
	return fetch('${apiUrl}/builds/${buildId}/preparation', baseOptions); 
}

exports.fetchBuildPlan = function(buildId) {
	return fetch('${apiUrl}/builds/${buildId}/plan', baseOptions); 
}

exports.fetchBuildResources = function(buildId) {
	return fetch('${apiUrl}/builds/${buildId}/resources', baseOptions); 
}

exports.fetchBuildEvents = function(buildId) {
	return fetch('${apiUrl}/builds/${buildId}/events', baseOptions); 
}
