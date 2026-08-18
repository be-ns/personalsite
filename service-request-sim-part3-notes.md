# Part 3 - the pushback, and how I answer it

**The question:** "Our largest customer says shop coordination is their #1 pain point. Why
isn't that first?"

## Beats

**1. Concede the fact first.** 84 tickets, and the biggest account named it out loud. I am
not going to argue with that pain, and I am not going to argue with the person who collected
it.

**2. Split what they said from what is happening to them.** Read the tickets and the top
complaint inside "coordination" is "the repair is done and the system still says
in-progress." That is a state problem wearing a coordination costume. Nobody is asking for a
scheduling product yet. They are asking to stop calling the shop to find out what the shop
already knows.

**3. Show what ships for shops in this release.** Scoped token, no seat and no login. One tap
to complete. The status updates itself and the driver is notified. That is the
highest-frequency shop failure in the ticket set, and it closes now, not next quarter.

**4. The substrate argument.** Real coordination - scheduling, parts, messaging between two
companies - has to sit on state both sides trust. Integrate today and we are syncing three
duplicate tickets and a stale status to a second party. That is automating the confusion, and
it is harder to unwind than not doing it.

**5. Sequenced, not cut.** 60-day remeasure. If shop coordination is still the top theme once
state is trustworthy, it is the next thing we build, and it ships in half the time because
the substrate exists.

## Landing

Stop after "half the time because the substrate exists." Do not fill the silence.

## Avoid

Anything in the neighborhood of "one loud customer is not a roadmap." It is true in a
textbook and it reads as dismissing the CS function, which is the one group in the room that
actually talked to the customer. The concession in beat 1 is load-bearing. Do not rush it to
get to the argument.
