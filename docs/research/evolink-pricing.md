# EvoLink generation pricing — verified 2026-11-02

Public Chinese model pages and the live pricing directory were checked in the
browser. The directory reports an update date of 2026-10-30. Older English
pages and blog posts show different prices; do not substitute their rates.

## Basis

- Customer generation price = upstream **base generation** fee × **8**.
- 1,000 Pavo credits = $1. Credits are not EvoLink's own credits.
- Whole-credit charges round upward, so the difference is less than $0.001.
- One request produces one image or a **5-second** text-to-video clip.
- All package intervals sell credits at this same rate. Annual packages
  contain 12 monthly allocations, granted upfront. One-time purchases are
  finite credit packs. No package promises unlimited generation.

| Model             | Quality      | Upstream fee                 | Customer fee     | Pavo credits |
| ----------------- | ------------ | ---------------------------- | ---------------- | -----------: |
| Nano Banana 2     | 1K           | $0.063/image                 | $0.504/image     |          504 |
| Nano Banana 2     | 2K           | $0.094/image                 | $0.752/image     |          752 |
| Nano Banana 2     | 4K           | $0.141/image                 | $1.128/image     |        1,128 |
| Seedream 4        | 1K / 2K / 4K | $0.0225/image                | $0.180/image     |          180 |
| Wan 2.7           | 720p         | $0.080/second                | $3.20/5 seconds  |        3,200 |
| Wan 2.7           | 1080p        | $0.120/second                | $4.80/5 seconds  |        4,800 |
| Seedance 2.0      | 720p         | $0.199/second                | $7.96/5 seconds  |        7,960 |
| Seedance 2.0      | 1080p        | $0.497/second                | $19.88/5 seconds |       19,880 |
| Seedance 2.0 Fast | 720p         | $0.161/second (regular rate) | $6.44/5 seconds  |        6,440 |

Nano Banana output prices use the current pricing table's displayed USD
amounts. Seedream's page gives $0.0225 in the detailed comparison and 1.53
EvoLink credits, while its summary rounds this to $0.023. Its base image fee
does not change by resolution; remove the previous invented quality premiums.

The Seedance page still displays a 25% Fast promotion with an expiry of
**2026-10-06 (UTC+8)**. Because it has already expired, budget Fast at its
regular rate (approximately $0.161/second), not the displayed promotional
$0.121/second. Verify the account's actual rate before adjusting this again.
Fast supports 480p/720p, not 1080p. In Pavo's 1080p mode, the Fast switch
uses the Standard route and Standard price.

Nano Banana additionally bills input/output/thinking tokens. These variable
fees are **not included** in this base-fee multiplier and can reduce the
realized margin below 8× all-in cost. Web/image search and reference images
are not currently offered by this generator. No live paid generation was
submitted to verify these prices.

## Packages

| Tier       | Monthly | Monthly credits | Annual / month | Annual charge | Annual credits | One-time | One-time credits |
| ---------- | ------: | --------------: | -------------: | ------------: | -------------: | -------: | ---------------: |
| Starter    |  $19.90 |          19,900 |         $19.90 |       $238.80 |        238,800 |    $9.90 |            9,900 |
| Pro        |  $59.90 |          59,900 |         $49.90 |       $598.80 |        598,800 |   $29.90 |           29,900 |
| Enterprise |  $99.90 |          99,900 |         $79.90 |       $958.80 |        958,800 |   $79.90 |           79,900 |

All three tiers have distinct prices within each billing option. The entry
monthly and annual comparison prices both start at $19.90 as requested.
The conversion remains 1,000 credits per USD, including annual and one-time
packs. Annual cards show the monthly equivalent; checkout charges the
full annual total. These are different credit budgets rather than a change
to the per-generation model rates.

Usage counts on cards are alternatives, not cumulative entitlements:
Seedream 4 2K images **or** Wan 2.7 720p 5-second clips, rounded down. The generation paywall only shows
packages that can fund the selected request. The selected model, resolution
and Fast mode survive the checkout redirect. Per-model rate tables are kept
in this internal research note and are not displayed on the website.

## Sources

- [Live directory](https://evolink.ai/zh/pricing)
- [Nano Banana 2](https://evolink.ai/zh/nano-banana-2)
- [Seedream 4](https://evolink.ai/zh/seedream-4)
- [Wan 2.7](https://evolink.ai/zh/wan-2-7)
- [Seedance 2.0](https://evolink.ai/zh/seedance-2-0)
