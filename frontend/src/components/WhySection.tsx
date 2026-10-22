const REPO = 'https://github.com/JordanGrieve/dropline'

/**
 * Why the project exists, for a visitor who has just watched the stampede.
 * The words come from README.md, TECH-STACK.md and docs/results/NOTES.md.
 */
export function WhySection() {
  return (
    <section className="why" aria-labelledby="why-title">
      <p className="eyebrow" id="why-title">
        Why this was built
      </p>
      <h2>One sentence to earn, and a hard problem that cannot be dodged.</h2>

      <div className="why-grid">
        <div className="why-block">
          <h3>The problem is the point</h3>
          <p>
            Overselling is the canonical race condition. Ten thousand people press Buy for a hundred units in the same
            second, and every one of them has to get the right answer. There is no way to drift into building features
            instead of solving it, because the feature <em>is</em> the solution.
          </p>
        </div>
        <div className="why-block">
          <h3>Real time by nature</h3>
          <p>
            A counter that every viewer watches fall at once is not decoration here, it is the product. That makes the
            WebSocket work, the fan-out across instances and the ordering of messages part of the core, not an
            afterthought.
          </p>
        </div>
        <div className="why-block">
          <h3>The load test is the acceptance test</h3>
          <p>
            A thing that works is the floor. Success is a set of numbers, measured under stated conditions, and a
            failure caused on purpose to prove the numbers mean something: remove the guard, run the same load, and
            watch the stock go negative.
          </p>
        </div>
      </div>

      <div className="why-grid">
        <div className="why-block">
          <h3>Why this stack</h3>
          <p>
            Java 21 and Spring Boot because that is what the employers worth working for actually run, and because
            the OpenTelemetry Java agent instruments the whole application with no code changes. Postgres because the
            database is the arbiter of stock, not the application. Redis pub/sub because the moment there is more than
            one instance, a server only knows about its own viewers.
          </p>
        </div>
        <div className="why-block">
          <h3>Where it comes from</h3>
          <p>
            It sits in a domain already lived in: holding a real storefront through its biggest drops and sale days.
            This is the backend half of that story, built from scratch so every decision in it can be explained.
          </p>
        </div>
        <div className="why-block">
          <h3>What it earned</h3>
          <dl className="why-numbers">
            <div>
              <dt>Buyers, simultaneous</dt>
              <dd>10,000</dd>
            </div>
            <div>
              <dt>Sold, every run</dt>
              <dd>exactly 100</dd>
            </div>
            <div>
              <dt>p99, two instances, warm</dt>
              <dd>under 0.5 s</dd>
            </div>
            <div>
              <dt>Viewers, every broadcast received</dt>
              <dd>5,000</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="why-foot muted">
        The code, the documents it was built from, and the numbers from every load run are in the repository:{' '}
        <a href={REPO}>github.com/JordanGrieve/dropline</a>.
      </p>
    </section>
  )
}
