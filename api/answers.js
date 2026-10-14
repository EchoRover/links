// ============================================================
// GET /api/answers?round=acol351-tut6 — model answers for the sheet
//
// Served from here rather than shipped in the page so they can be withheld
// while the quiz is running. A page that hid them with CSS would still carry
// every answer to every phone in the room; this does not send them at all
// between hideFrom and hideUntil.
// ============================================================

const ROUNDS = {
  "acol351-tut5": {
    hideFrom: "2026-10-07T15:30:00+04:00",
    hideUntil: "2026-10-07T16:30:00+04:00",
    answers: [
      {
        q: 1,
        verdict: "Dijkstra with max instead of +",
        idea: "A path now costs its largest edge, so replace dist[u] + len(u,v) with max(dist[u], len(u,v)). Example: s→a (5), a→t (1) vs s→b (3), b→t (4). By sum s-a-t wins (6 < 7); by bottleneck s-b-t wins (4 < 5).",
        code: `BottleneckDijkstra(G, s)
  for each v: dist[v] = ∞, done[v] = false
  dist[s] = 0                      // empty path
  while some vertex not done:
    u = not-done vertex with smallest dist
    done[u] = true
    for each edge (u, v):
      new = max(dist[u], len(u,v)) // was dist[u] + len(u,v)
      if new < dist[v]: dist[v] = new
  return dist`,
        why: "Dijkstra's proof only needs: adding an edge never makes a path cheaper. Here max(b, ℓ) ≥ b, so it holds. When u is popped, any other s→u route leaves the done set on some edge (x, y) with y not done; its bottleneck is ≥ max(dist[x], len(x,y)) ≥ dist[y] ≥ dist[u]. So dist[u] is final.",
        time: "O((m + n) log n) with a min-heap, same as Dijkstra.",
      },
      {
        q: 2,
        verdict: "Two copies of the graph, Dijkstra on that",
        idea: "Copy 0 = voucher unused, copy 1 = voucher used. Using the voucher on (u, v) is a free jump u0 → v1, and there is no way back. Example: s→a (4), a→t (7): no voucher 11, voucher on s→a 7, voucher on a→t 4. Dijkstra finds 4.",
        code: `VoucherPath(G, s, t)
  for each vertex v: add v0, v1 to G'
  for each edge (u, v) with weight w:
    add u0 → v0 weight w   // voucher unused
    add u1 → v1 weight w   // voucher used
    add u0 → v1 weight 0   // use it on (u, v)
  dist = Dijkstra(G', s0)
  return min(dist[t0], dist[t1])`,
        why: "An s0→t1 path crosses from copy 0 to copy 1 exactly once, on a 0-weight edge u0→v1: read back in G it is an s-t path with (u, v) made free, same cost, and every such path in G gives one in G'. s0→t0 paths are paths without the voucher. All weights ≥ 0, so Dijkstra is valid.",
        time: "G' has 2n vertices, 3m edges: O((m + n) log n).",
      },
      {
        q: 3,
        verdict: "Weights −log(1 − pₑ), then Dijkstra",
        idea: "A path works only if every edge works, so success probabilities multiply. Logs turn the product into a sum: weight each edge −log(1 − pₑ) ≥ 0 and find the shortest path.",
        code: `MostReliablePath(G, s, t)
  for each edge e:
    if p(e) == 1: delete e          // always fails
    else weight(e) = -log(1 - p(e)) // >= 0
  Dijkstra(G, s) with parent pointers
  if dist[t] == ∞: return "no path"
  P = follow parents back from t
  return P, failure prob 1 - e^(-dist[t])`,
        why: "Since 0 < 1 − pₑ ≤ 1 every weight is ≥ 0, so Dijkstra is valid. A path's total weight is −log Π(1 − pₑ) = −log Pr[path works], and −log is decreasing, so the smallest total weight = the largest success probability = the least failure probability.",
        time: "O(m) for weights + Dijkstra: O((m + n) log n).",
      },
      {
        q: 4,
        verdict: "(a) No  (b) Yes, topological order, O(n + m)",
        idea: "For longest paths adding an edge makes a path better, so a vertex popped early is not final. In a DAG, go in topological order: when you reach v, every way into v is already known.",
        code: `(a) Counterexample:
  s --3--> a
  s --1--> b --5--> a
Max-Dijkstra pops a first (3 > 1), fixes dist[a] = 3,
but s→b→a = 6.

(b) LongestPathDAG(G, s)
  order = topological order of G
  for each v: longest[v] = -∞
  longest[s] = 0
  for each u in order:
    for each edge (u, v):
      longest[v] = max(longest[v], longest[u] + w(u,v))
  return longest           // -∞ = unreachable`,
        why: "(a) In general graphs longest simple path is NP-hard (it contains Hamiltonian path), so no simple fix exists unless P = NP. (b) In a DAG every path is simple. The longest path to v ends with some edge (u, v), so longest[v] = max over in-edges of longest[u] + w(u,v); in topological order every u is final before its edge into v is used. Induction along the order.",
        time: "(b) O(n + m): topological sort + one pass over the edges.",
      },
      {
        q: 5,
        verdict: "Only (c), earliest deadline first",
        idea: "Lateness is about deadlines. Length and slack ignore what matters: a short job with a far deadline can wait.",
        code: `(a) FALSE. J1: ℓ=1, d=100; J2: ℓ=10, d=10.
    Shortest first: J2 ends at 11, lateness 1.
    J2 first: max lateness 0.
(b) FALSE. J1: ℓ=1, d=2 (slack 1); J2: ℓ=10, d=10 (slack 0).
    Slack order: J2 then J1, J1 ends at 11, lateness 9.
    J1 first: max lateness 1.
(c) TRUE (exchange argument, below).`,
        why: "(c) Take any schedule with no idle time. If it is not EDF it has adjacent jobs i then j with dᵢ > dⱼ; swap them. j now ends earlier, and i ends at j's old finish C with lateness max(0, C − dᵢ) ≤ max(0, C − dⱼ) = j's old lateness. So the max lateness does not go up. Each swap removes one inversion, so after ≤ n² swaps we reach EDF without getting worse.",
        time: "Sort by deadline: O(n log n).",
      },
      {
        q: 6,
        verdict: "None of them work for total lateness",
        idea: "\"Problem 1\" on the sheet is a numbering leftover; it means Problem 5. For the total, even EDF fails: one long early-deadline job makes the job behind it late too.",
        code: `(a) FALSE. Same jobs as Q5(a): shortest first total 1, other order 0.
(b) FALSE. Same jobs as Q5(b): slack order total 9, other order 1.
(c) FALSE. J1: ℓ=10, d=5; J2: ℓ=1, d=6.
    EDF (J1, J2): lateness 5 + 5 = 10.
    J2 first: 0 + 6 = 6 < 10.`,
        why: "Minimising total lateness is NP-hard in general, so unless P = NP no simple sort-by-a-key greedy can be correct.",
        time: "",
      },
      {
        q: 7,
        verdict: "Only (b), earliest finish time",
        idea: "Finishing first leaves the most room for everything after it. The other rules can grab one job that blocks two good ones.",
        code: `(a) FALSE. [0,10], [1,2], [3,4]: picks [0,10], gets 1. Optimal 2.
(c) FALSE. [0,5], [6,10], [4,7]: shortest is [4,7],
    overlaps both, gets 1. Optimal 2.
(d) FALSE. a=[0,3] b=[4,7] c=[8,11] d=[12,15] (optimal, 4 jobs)
    m=[6,9] overlaps only b, c.
    3 copies of p=[2,5], 3 copies of q=[10,13].
    Conflicts: a 3, b 4, c 4, d 3, m 2, each p 4, each q 4.
    Greedy picks m (fewest), kills b and c, then at most
    one of {a, p's} and one of {d, q's}: 3 jobs < 4.`,
        why: "(b) TRUE. Greedy picks g1..gk, optimal o1..ol, both sorted by finish time f. By induction f(gᵣ) ≤ f(oᵣ): greedy's first pick finishes first overall, and oᵣ₊₁ starts after f(oᵣ) ≥ f(gᵣ), so it is still available at pick r + 1 and greedy takes something finishing no later. If l > k, oₖ₊₁ would still be available when greedy stops: impossible. So k = l.",
        time: "Sort by finish: O(n log n).",
      },
      {
        q: 8,
        verdict: "Havel–Hakimi",
        idea: "Join the vertex of largest degree d₁ to the d₁ vertices of next largest degree, remove it, repeat. An edge swap shows this choice never loses a solution.",
        code: `IsGraphical(d)
  loop:
    if some entry < 0: return NO
    if all entries == 0: return YES
    sort d descending
    remove d1 from d
    if d1 > (entries left): return NO
    subtract 1 from each of the first d1 entries`,
        why: "Lemma: if sorted d is graphical, some realisation has v₁ adjacent to exactly S = {v₂, …, v_{d₁+1}}. Take one where v₁ has the most neighbours in S. If v₁ misses some vⱼ ∈ S, it is adjacent to some vₖ ∉ S, and dⱼ ≥ dₖ. Then vⱼ has a neighbour w ≠ vₖ not adjacent to vₖ (else dₖ ≥ dⱼ + 1, since vₖ also has v₁). Swap edges v₁vₖ, vⱼw for v₁vⱼ, vₖw: still simple, degrees unchanged, one more neighbour in S. Contradiction. So d is graphical iff the reduced sequence is.",
        time: "≤ n rounds, each a sort: O(n² log n).",
      },
      {
        q: 9,
        verdict: "Greedy is optimal",
        idea: "Two coins of 2ⁱ can always be swapped for one 2ⁱ⁺¹, so a best answer uses each small coin at most once. That is L in binary (plus the 2¹⁰⁰⁰ coins), which is exactly what greedy builds. Example: 13 = 8 + 4 + 1.",
        code: `(1) In an optimal solution each coin 2^i, i < 1000,
    is used at most once (2 × 2^i → one 2^(i+1), fewer coins).
(2) So optimal = q coins of 2^1000 + distinct smaller powers
    summing to r. Distinct powers below 2^1000 sum to
    at most 2^1000 - 1, so r < 2^1000:
    q = floor(L / 2^1000), r = L mod 2^1000,
    and the powers are the 1-bits of r (unique).
(3) Greedy takes floor(L / 2^1000) big coins, then the
    largest power <= remainder each time = r in binary.
    Same as (2).`,
        why: "The optimal solution is unique and fully determined by (1) and (2), and greedy produces exactly it. (Contrast: coins {1, 34, 70, 100}, L = 140: greedy 100 + 34 + 6×1 = 8 coins, but 70 + 70 = 2.)",
        time: "",
      },
      {
        q: 10,
        verdict: "Biggest item first, to the poorest agent",
        idea: "Plain round robin fails: values 10, 1, 1 with 2 agents gives {10, 1} and {1}; removing the 1 from {10, 1} leaves 10 > 1. Fix: biggest first, each to the currently poorest agent → {10} and {1, 1}: fair.",
        code: `FairGoods(v[1..m], n)
  sort items: v1 >= v2 >= ... >= vm
  each agent: bundle = {}, value = 0
  pq = min-heap of agents by value
  for j = 1..m:
    i = pop poorest agent
    add item j to bundle[i]; value[i] += vj
    push i back`,
        why: "Invariant: fair after every step. Item g goes to the poorest agent k, so every i has v(Aᵢ) ≥ v(Aₖ) = v(Aₖ ∪ {g}) − g. Items arrive biggest first, so g is the smallest item in Aₖ ∪ {g}: removing any item leaves at most v(Aₖ ∪ {g}) − g ≤ v(Aᵢ). Other bundles only grow.",
        time: "O(m log m + m log n).",
      },
      {
        q: 11,
        verdict: "Sort by |v|; goods to the poorest, chores to the richest",
        idea: "Goods vⱼ ≥ 0, chores vⱼ < 0. Sort all items by |vⱼ|, biggest first, mixed. The new item is always the smallest so far, so it is the one the fairness test cares about. Q10 is the case with no chores.",
        code: `FairMixed(v[1..m], n)
  sort items: |v1| >= |v2| >= ... >= |vm|
  each agent: bundle = {}, value = 0
  for j = 1..m:
    if vj >= 0: i = agent with smallest value  // good
    else:       i = agent with largest value   // chore
    add item j to bundle[i]; value[i] += vj`,
        why: "Conditions: chore c ∈ Aᵢ: v(Aᵢ) + |c| ≥ v(Aₖ); good g ∈ Aₖ: v(Aᵢ) ≥ v(Aₖ) − g. Good g to poorest k: v(Aᵢ) ≥ v(Aₖ old) = v(Aₖ new) − g, and any chore cᵢ in Aᵢ came earlier so |cᵢ| ≥ g. Chore c to richest i: v(Aᵢ new) + |c| = v(Aᵢ old) ≥ v(Aₖ); and for k's smallest good gₖ ≥ |c|: v(Aᵢ new) = v(Aᵢ old) − |c| ≥ v(Aₖ) − gₖ. Everything else only moves in the helpful direction. Order matters: goods-then-chores fails on 10, 1, −100.",
        time: "O(m log m + m log n) with the agents in a balanced BST or two heaps.",
      },
    ],
  },
  "acol351-tut6": {
    hideFrom: "2026-10-14T15:30:00+04:00",
    hideUntil: "2026-10-14T16:30:00+04:00",
    answers: [
      {
        q: 1,
        verdict: "No: the cheapest edge at s is in both trees",
        idea: "Let (s, v) be the cheapest edge touching s. Example: s–a 3, s–b 4, a–b 2. Shortest-path tree = {s–a, s–b} (b through a costs 5 > 4). MST = {a–b, s–a}. The trees differ, but both contain s–a.",
        code: `Claim: (s, v) = cheapest edge at s is in both.
MST: cut {s} vs the rest. The crossing edges are
  the edges at s; the cheapest is (s, v), so by
  the cut property it is in the MST.
SPT: any other s-v path starts with (s, w), w != v,
  costing more than c(s, v), plus more positive
  edges. So the edge (s, v) is the unique shortest
  s-v path, and every shortest-path tree has it.`,
        why: "Costs are positive and distinct, so the cut property applies and no other path to v can tie with the single edge.",
        time: "",
      },
      {
        q: 2,
        verdict: "Split at the median, recurse on half the edges",
        idea: "The best bottleneck is the smallest b such that the edges of cost ≤ b connect the graph. Median M: if the cheap half connects G, recurse on it. If not, the answer is > M, every cheap edge is free: keep them, squash each cheap group to one dot, recurse on the expensive half. Example: 1–2 (1), 3–4 (2), 2–4 (3), 1–3 (4), 2–3 (5), 1–4 (6). Median 3: cheap half connects, keep it. Median 2: {1,2} and {3,4} not connected, keep 1–2 and 3–4, squash, recurse on {2–4}. Tree 1–2, 3–4, 2–4, bottleneck 3.",
        code: `MBST(G)
  if G has one vertex: return {}
  if G has one edge: return {that edge}
  M = FindMedian(edge costs)
  A = edges with cost <= M;  B = the rest
  components of (V, A) by BFS/DFS
  if (V, A) connected: return MBST((V, A))
  F = spanning forest of (V, A)
  G' = contract each component, keep B edges
       between different components
  return F ∪ MBST(G')`,
        why: "A tree with bottleneck ≤ b exists iff edges ≤ b connect G. Connected case: the answer is ≤ M, so A edges suffice. Otherwise every tree needs a B edge, the answer is > M; F ∪ T' is a spanning tree whose max is T's max, and any tree's B edges contain a spanning tree of G', so none does better.",
        time: "One round O(m) (median, split, BFS, contract; n ≤ m + 1). Distinct costs → recursion on ≤ ⌈m/2⌉ edges: T(m) = T(m/2) + O(m) = O(m).",
      },
      {
        q: 3,
        verdict: "Add e, drop the most expensive edge on the cycle",
        idea: "T + e has exactly one cycle: the tree path u→v plus e. By the cycle property its most expensive edge is not in the MST. Example: T = a–b (1), b–c (4), c–d (2); add a–c (3). Cycle costs 1, 4, 3: drop b–c. If a–c cost 5, drop a–c itself: T stays.",
        code: `UpdateMST(T, e = (u, v), c)
  P = path from u to v in T   // DFS in T
  f = most expensive edge on P + e
  if f == e: return T
  return T + e - f`,
        why: "Every non-tree edge of G was the most expensive on some cycle of G, still there in G + e, so the new MST lies inside T + e; its only cycle loses its most expensive edge f, leaving the spanning tree T + e − f.",
        time: "T has n − 1 edges: DFS and the scan of P are O(n). Total O(|V|).",
      },
      {
        q: 4,
        verdict: "(a) correct, (b) wrong",
        idea: "A stop has no fixed cost: it takes litres/r. So time = total litres bought / r, and the number of stops does not matter. (a) buys exactly what it burns; (b) fills up and can arrive at B with fuel left. (b) is the fewest-stops greedy, a different problem.",
        code: `(b) counterexample: C = 10 L, F = 1 L/km,
  stations 0, 9, 11 (= B), start empty.
  (a): 9 L + 2 L = 11 L -> 11/r min
  (b): 10 L, then at 9 has 1 L < 2: +9 L
       = 19 L -> 19/r min. Worse.
(a) exchange: optimal O buys o_i, (a) buys a_i.
  i = first station with o_i != a_i. Same tank at
  x_i, (a) buys the least that reaches x_{i+1},
  so o_i > a_i; d = o_i - a_i.
  O' = O but a_i at x_i and o_{i+1} + d at x_{i+1}
  (drop d if x_{i+1} = B). Same tank leaving
  x_{i+1} (<= C), same or less total: still optimal,
  agrees with (a) one station longer. Repeat.`,
        why: "Each exchange keeps O' valid and never adds time, and after at most n − 1 exchanges O' is (a), so (a) is optimal. One counterexample is enough to kill (b).",
        time: "",
      },
      {
        q: 5,
        verdict: "Cut T at e; the cycle in T' + e crosses back at e'",
        idea: "Removing e from T splits it into two pieces. Adding e to T' makes one cycle; it crosses between the pieces at e, so it must cross back at another edge e'. Example: square a,b,c,d + diagonal ac; T = {ab, bc, cd}, T' = {ac, ad, bc}, e = ab: pieces {a}, {b,c,d}; cycle a–b–c–a crosses back at ac = e'. T + ac − ab and T' + ab − ac are both trees.",
        code: `1. T != T', same size -> some e in E \\ E'.
2. T - e = two pieces S, V\\S; e is the only
   T edge between them.
3. T' + e has one cycle Z through e. Z crosses
   S -> V\\S at e, so it crosses back at e' != e.
4. e' on Z, e' != e -> e' in E'. e' crosses the
   cut but only e does in T -> e' not in E.
5. T + e' - e: e' rejoins the two pieces,
   n - 1 edges -> spanning tree.
6. T' + e - e': e' is on the only cycle Z,
   removing it keeps it connected -> tree.`,
        why: "Both new graphs are connected with n − 1 edges, so both are spanning trees.",
        time: "",
      },
      {
        q: 6,
        verdict: "DP with two numbers per day: bestA, bestB",
        idea: "Only yesterday's store matters. bestA[i] = most you can earn on days 1..i ending at A; same for B. Example: C = 5, PA = 10, 1, 10, PB = 1, 20, 1. bestA = 10, 11, 30; bestB = 1, 25, 26. Answer 30: A, B, A.",
        code: `TwoStores(PA, PB, C, n)
  bestA[1] = PA(1); bestB[1] = PB(1)
  for i = 2..n:
    bestA[i] = PA(i) + max(bestA[i-1], bestB[i-1] - C)
    bestB[i] = PB(i) + max(bestB[i-1], bestA[i-1] - C)
  answer = max(bestA[n], bestB[n])
  trace back: at each day repeat the choice
  that gave the max`,
        why: "An optimal schedule ending at A on day i was at A or B on day i − 1, and its first i − 1 days must be the best schedule ending there (else swap in a better one). So the max of the two options is right; induction from day 1.",
        time: "O(n).",
      },
      {
        q: 7,
        verdict: "Knapsack-style DP over hours",
        idea: "Max average = max total. best[i][h] = largest total for courses 1..i using at most h hours: try every k hours for course i plus best[i−1][h−k]. Greedy (next hour to the biggest gain) fails: H = 3, f1 = 1, 3, 4, 4, f2 = 1, 1, 5, 6 for 0..3 hours. Greedy ends at 5; course 1 with 1 h + course 2 with 2 h gives 3 + 5 = 8.",
        code: `Allocate(f[1..n], H)
  best[0][h] = 0 for all h
  for i = 1..n:
    for h = 0..H:
      best[i][h] = max over k = 0..h of
                   f[i](k) + best[i-1][h-k]
      choice[i][h] = the best k
  trace back from (n, H) for the hours
  return best[n][H] / n`,
        why: "In an optimal plan course i gets some k hours and courses 1..i−1 use the rest optimally (else swap). Trying every k gives the right value; induction on i.",
        time: "n(H + 1) cells × O(H) each = O(nH²). Polynomial, nothing in an exponent.",
      },
    ],
  },
};

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const round = ROUNDS[String(req.query.round || "")];
  if (!round) return res.status(404).json({ ok: false, error: "no such round" });

  const now = Date.now();
  if (now >= Date.parse(round.hideFrom) && now < Date.parse(round.hideUntil)) {
    return res.status(200).json({ ok: true, hidden: true, until: round.hideUntil });
  }
  return res.status(200).json({ ok: true, answers: round.answers });
}
