# GitHub API Usage Analysis

## Current Implementation: Webhook-Only (Zero API Calls)

The bot currently uses **zero GitHub API calls** by relying entirely on webhooks.

### How It Works

1. **GitHub sends webhooks** when events occur (push, PR, review, etc.)
2. **We store data** from webhook payloads
3. **No API polling** or proactive syncing

### API Call Breakdown

| Scenario | API Calls/Hour | Notes |
|----------|---------------|-------|
| **Current (webhook-only)** | **0** | All data from webhooks |
| **With API fallback** | **~0-5** | Only when webhook payload missing data |
| **With full sync** | **~100-500** | If polling all repos/PRs |

### For Your Setup: 5 Orgs, 15 Devs

**Current approach (webhook-only):**
- ✅ **API calls: 0/hour**
- ✅ **Rate limit: N/A** (no calls)
- ✅ **Real-time data** (as events happen)
- ⚠️ **Risk: Missing data** if webhook delivery fails

**With optional API fallback (recommended):**
- ✅ **API calls: ~0-5/hour** (only when webhook data incomplete)
- ✅ **Rate limit: Safe** (5,000/hour limit, using ~0.1%)
- ✅ **More reliable** (fills gaps when webhooks miss data)

### When API Calls Happen (with fallback)

API calls are only made when:
1. **Merged PR missing stats**: If `additions`/`deletions` are 0 in webhook payload
   - Frequency: ~1-5 calls/day (only for merged PRs with missing stats)
   - Cost: 1 API call per PR

2. **Installation token lookup**: When fetching PR stats
   - Frequency: ~1 call per org per hour (cached)
   - Cost: 1 API call per unique org

### Rate Limit Safety

GitHub App rate limits:
- **5,000 requests/hour** per installation
- **15,000 requests/hour** for server-to-server

With 5 orgs and fallback enabled:
- **Worst case**: ~50 API calls/day (if all merged PRs missing stats)
- **Typical case**: ~5-10 API calls/day
- **Usage**: ~0.02% of rate limit

### Recommendations

1. **Keep webhook-only approach** (current) - works great for most cases
2. **Add API fallback** (implemented) - fills gaps when webhook data incomplete
3. **Monitor webhook delivery** - track failed deliveries
4. **Optional: Periodic sync** - only if you need historical backfill

### Monitoring

To track API usage, check logs for:
- `"Fetched PR stats from API"` - API fallback triggered
- `"Failed to fetch PR stats from API"` - API call failed

### Cost Analysis

**Current (webhook-only):**
- API calls: 0
- Infrastructure: Database storage only
- Cost: Minimal

**With fallback:**
- API calls: ~5-50/day
- Infrastructure: Same
- Cost: Still minimal, much more reliable
