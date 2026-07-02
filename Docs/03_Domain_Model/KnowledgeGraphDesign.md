# Knowledge Graph Design (DAG)

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine
- **Traceability:** DECISION-025 (Graph is DAG), DECISION-029 (Cycle detection reachability check)

---

## 1. Graph Structural Properties

The Knowledge Graph represents the comprehensive topology of all skills.

* **Directed Acyclic Graph (DAG):** Edges have direction (from parent to child) and must contain no cyclic paths ($A \to B \to C \to A$ is strictly illegal).
* **Multi-Parent Nodes:** A node may have multiple parents. For example, the node `"Web Security"` might have prerequisites in both `"Cryptography"` and `"HTTP Protocol"`.
* **Multi-Relation Types:** Relationships between nodes carry specific semantic definitions.

---

## 2. Relationship Types

Every edge in `dbo.knowledge_edge` must declare one of the following relation types:

1. **`prerequisite_of`**
   - *Definition:* Node A must be mastered or introduced before Node B can be attempted.
   - *Validation:* Standard path dependencies enforce this order in roadmap generation.
2. **`expands_to`**
   - *Definition:* Node B is a sub-concept, specialization, or detailed sub-topic of Node A.
   - *Example:* `"JWT Signature Verification"` expands `"JSON Web Tokens"`.
3. **`related_to`**
   - *Definition:* A weak association between Node A and Node B. Does not enforce prerequisite order but signals context sharing.

---

## 3. Runtime Cycle Detection

To prevent logical loops in the curriculum, cycle detection must execute prior to adding any edge (`A -> B`).

* **Strategy (DECISION-029):** **Runtime Reachability Check**.
* **Algorithm:** Standard Depth-First Search (DFS) or Breadth-First Search (BFS) reachability traversal.
* **Logic Flow:**
  1. Service receives command: `AddEdgeCommand { from_node_id: A, to_node_id: B }`.
  2. The system queries if a path exists from **`B` to `A`** in the database.
  3. If a path $B \to \dots \to A$ is found, adding $A \to B$ would form a cycle ($A \to B \to \dots \to A$).
  4. The operation is rejected, raising a `GRAPH_CYCLE_DETECTED` business exception.
  5. If no path is found, the transaction commits the new `KnowledgeEdge`.

* **SQL Traversal Check (Recursive CTE):**
  ```sql
  -- Checking if A is reachable from B
  WITH path_traversal AS (
      -- Anchor member: start traversal from node B
      SELECT to_knowledge_node_id, 1 AS depth
      FROM dbo.knowledge_edge
      WHERE from_knowledge_node_id = @NodeB
      
      UNION ALL
      
      -- Recursive member: traverse child nodes
      SELECT ke.to_knowledge_node_id, pt.depth + 1
      FROM dbo.knowledge_edge ke
      JOIN path_traversal pt ON ke.from_knowledge_node_id = pt.to_knowledge_node_id
      WHERE pt.depth < 100 -- Guard against database corruption recursion loops
  )
  SELECT COUNT(1) AS path_exists
  FROM path_traversal
  WHERE to_knowledge_node_id = @NodeA;
  ```
