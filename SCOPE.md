# Scope

The danger with this project is not that it is too hard. It is that "useful"
grows features, and every feature is time taken from the concurrency,
resilience and load work that is the entire reason to build it.

So the scope is written as a fence, not a wish list.

## In scope

**One product.** One name, one price, one image, one fixed quantity.

**One drop.** A single moment when stock becomes buyable. Before it, a
countdown. After it, either stock remaining or sold out.

**One page.** A landing page that shows the product, the countdown, the live
stock counter and a buy button. That is the entire interface.

**A live counter.** Stock falls in real time for every connected viewer at
once, over a WebSocket.

**An atomic purchase.** It cannot oversell. Not under any load, not with any
number of instances.

**Three concurrency strategies**, implemented and measured against each other:

1. Conditional `UPDATE ... WHERE remaining > 0`
2. Optimistic locking with a version column
3. Pessimistic locking with `SELECT ... FOR UPDATE`

**Load tests that are part of the build**, not run once at the end.

**Observability**, so that when something breaks under load there is a trace
explaining it rather than a guess.

**Deployment to AWS**, as a target to measure against rather than a permanent
home.

## Out of scope

Written down so there is no argument with myself later.

- **No accounts.** No sign up, no sign in, no password reset. A buyer is a
  name in a box.
- **No payments.** A purchase reserves a unit. Stripe is a solved problem and
  solving it again proves nothing.
- **No admin panel.** The drop is configured in the database or a config file.
- **No email.** No confirmations, no receipts, no notifications.
- **No multiple products.** One. The moment there are two, the interesting
  problem is sharding and that is a different project.
- **No mobile app.**
- **No CMS, no theming, no dark mode toggle.** The page follows the system
  preference and that is the end of it.
- **No component library, no state library, no router.** The front end is
  React, but it is one page with a handful of components and the drop data
  comes from the backend. Adding a UI kit or a router is adding features.

If I find myself building any of the above, I have stopped doing the project.

## The one allowed extension, and only at the end

A **waiting room**: buyers held in a queue before being admitted to the buy
page, with their position shown. It is the natural next hard problem and it is
what real drop systems actually do.

It is only allowed once everything in the "in scope" list above is finished,
measured and written up. Not before.

## Build order

**Week 1, correctness with no network in the way.**
Java and Spring Boot from scratch. One endpoint, Postgres, the conditional
UPDATE. A test that fires hundreds of concurrent purchases at one unit of
stock and asserts exactly one succeeds.

Then remove the `AND remaining > 0` and watch the test go red. If it does not
go red, the test is broken rather than the code, and nothing after this point
means anything. Do not move on until the failure has been seen.

**Week 2, the page and the live counter.**
A single landing page. A WebSocket connection pushing stock to every connected
client. Still one server, still local.

**Week 3, observability and the first real load test.**
Attach the OpenTelemetry Java agent, run the Grafana backend, confirm traces
and metrics arrive. Then k6 from this machine: ramp connections until
something breaks. Write down the number and what broke.

**Week 4, more than one instance, on AWS.**
Two app instances behind a load balancer, Redis for fan-out, managed Postgres.
Run the load test against it. Capture the numbers. Tear it down the same day.

**Week 5, the experiments and the writeup.**
See SUCCESS.md. The writeup is the deliverable; the code is what makes it
possible.

## Time budget

Five weeks of evenings and weekends, alongside a full time job.

If it runs over, the things to cut are AWS, Terraform and the third
concurrency strategy. The things never to cut are the conditional UPDATE, the
concurrency test that has been watched failing, and the load test numbers.
