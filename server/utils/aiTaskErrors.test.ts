import assert from 'node:assert/strict';
import {
  createAiImageRequestError,
  createMissingApiKeyError,
  createMockTaskPollResponse,
  isMockServerTaskId,
} from './aiTaskErrors.ts';

const missingVolc = createMissingApiKeyError('volcengine');
assert.equal(missingVolc.response.status, 500);
assert.equal(missingVolc.response.data.code, 'MISSING_VOLC_API_KEY');
assert.match(String(missingVolc.response.data.message), /VOLC_API_KEY/);

const missingDashScope = createMissingApiKeyError('dashscope');
assert.equal(missingDashScope.response.status, 500);
assert.equal(missingDashScope.response.data.code, 'MISSING_DASHSCOPE_API_KEY');
assert.match(String(missingDashScope.response.data.message), /DASHSCOPE_API_KEY/);

const upstream = createAiImageRequestError('volcengine', {
  response: { status: 429, data: { code: 'RateLimit', message: 'too many requests' } },
});
assert.equal(upstream.response.status, 429);
assert.equal(upstream.response.data.code, 'VOLC_IMAGE_REQUEST_FAILED');
assert.equal(upstream.response.data.upstreamCode, 'RateLimit');
assert.equal(upstream.response.data.message, 'too many requests');

assert.equal(isMockServerTaskId('mock-server-task-image-123'), true);
assert.equal(isMockServerTaskId('real-task-123'), false);

const mockPoll = createMockTaskPollResponse('mock-server-task-image-123', 'image', 'volcengine');
assert.equal(mockPoll.status, 502);
assert.equal(mockPoll.body.status, 'failed');
assert.equal(mockPoll.body.code, 'MOCK_TASK_NOT_EXECUTABLE');
assert.equal(mockPoll.body.type, 'image');
assert.equal(mockPoll.body.provider, 'volcengine');

console.log('aiTaskErrors tests passed');
