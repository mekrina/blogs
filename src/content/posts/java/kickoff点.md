---
title: kickoff总结
draft: true
tags:
  - 
description: from readObject to some interesting fucntion

---

## call compare

### PriorityQueue

1. CC，结合`TransformingComparator`

```txt
PriorityQueue#readObject
	PriorityQueue#heapfy
		PriorityQueue#siftDownUsingComparator
			TransformingComparator#compare（bridge）
				transformer#transform  (sink)
```

2. CB，结合`BeanComparator`

```txt
PriorityQueue#readObject
	PriorityQueue#heapfy
		PriorityQueue#siftDownUsingComparator
			BeanComparator#compare (bridge)
				PropertyUtils#getProperty
					TemplatesImpl.getOutputProperties (or other getter) (sink)
```



## call getter



