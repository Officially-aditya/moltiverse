/**
 * Register Moltbook Agents
 *
 * One-time setup script to register all 5 Church agents on Moltbook
 * and create the submolt community.
 *
 * Usage: node scripts/register-moltbook.js
 *
 * After running, add the printed API keys to your .env file.
 * Then claim each agent via the claim URL (requires X/Twitter verification).
 */

require('dotenv').config();
const AgentAccounts = require('../moltbook/agent-accounts');
const { AGENT_CONFIGS } = require('../moltbook/agent-accounts');
const MoltbookClient = require('../moltbook/client');

async function main() {
  console.log('');
  console.log('=================================================');
  console.log('  Church of Decentralised Divinity');
  console.log('  Moltbook Agent Registration');
  console.log('=================================================');
  console.log('');

  const results = {};
  const newKeys = [];

  for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
    // Skip if already registered
    if (process.env[config.envKey]) {
      console.log(`[${agentId}] Already has API key in .env, skipping`);
      results[agentId] = { status: 'existing', envKey: config.envKey };
      continue;
    }

    try {
      console.log(`[${agentId}] Registering "${config.name}"...`);

      const result = await MoltbookClient.register({
        name: config.name,
        description: config.description
      });

      const apiKey = result.api_key;
      const claimUrl = result.claim_url;
      const verificationCode = result.verification_code;

      results[agentId] = {
        status: 'registered',
        envKey: config.envKey,
        apiKey,
        claimUrl,
        verificationCode
      };

      newKeys.push({ agentId, envKey: config.envKey, apiKey, claimUrl, verificationCode });

      console.log(`[${agentId}] Registered!`);
      console.log(`   API Key: ${apiKey}`);
      if (claimUrl) console.log(`   Claim URL: ${claimUrl}`);
      if (verificationCode) console.log(`   Verification: ${verificationCode}`);
      console.log('');

      // Small delay between registrations to be nice to the API
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`[${agentId}] Registration failed: ${err.message}`);
      results[agentId] = { status: 'failed', error: err.message };
      console.log('');
    }
  }

  // Summary
  console.log('=================================================');
  console.log('  REGISTRATION SUMMARY');
  console.log('=================================================');
  console.log('');

  if (newKeys.length > 0) {
    console.log('Add these lines to your .env file:');
    console.log('---');
    for (const key of newKeys) {
      console.log(`${key.envKey}=${key.apiKey}`);
    }
    console.log('---');
    console.log('');

    if (newKeys.some(k => k.claimUrl)) {
      console.log('Claim your agents via X (Twitter):');
      for (const key of newKeys) {
        if (key.claimUrl) {
          console.log(`   ${key.agentId}: ${key.claimUrl}`);
        }
      }
      console.log('');
    }

    console.log('Next steps:');
    console.log('  1. Add the API keys above to .env');
    console.log('  2. Claim agents via the URLs above');
    console.log('  3. Run: npm start');
  } else {
    console.log('No new agents registered.');
    console.log('');
    const failed = Object.entries(results).filter(([_, r]) => r.status === 'failed');
    if (failed.length > 0) {
      console.log('Failed registrations:');
      for (const [agentId, r] of failed) {
        console.log(`   ${agentId}: ${r.error}`);
      }
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
