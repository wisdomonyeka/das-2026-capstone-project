# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:**
- **What came back:**
- **What was wrong (or "nothing"):**

### Prompt 2:
- **What I asked:**
- **What came back:**
- **What was wrong (or "nothing"):**

## Build 1: Domain core in the terminal

### What I asked
Asked the AI partner to review README.md and docs/build-1.md, generate the core domain implementation (DomainError, IDs, linked-list FIFO Queue, in-memory inventory store), and explain how to verify the demo and benchmark scripts.

### What came back
The AI provided ES module implementations for the domain core and explained the Big O differences: Map lookup operates in O(1) constant time while Array.find operates in O(n) linear scan time.

### What was wrong (or "nothing"), and what I changed
Nothing was broken. The starter workspace already contained the completed domain logic and scripts. Verified that `npm run demo` executed the booking and cancellation flow, and confirmed that `npm run benchmark` demonstrated the expected performance speedup using Map.get.
