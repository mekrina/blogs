---
title: kickoff总结
draft: true
tags:
  - 
description: from readObject to some interesting fucntion

---

# to compare
## PriorityQueue

PriorityQueue#readObject
	PriorityQueue#heapfy
		PriorityQueue#siftDownUsingComparator
			TransformingComparator#compare（bridge）
				transformer#transform  (sink)


