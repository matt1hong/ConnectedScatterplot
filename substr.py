def substring(a,b,c):
	p = len(a)
	q = len(b)
	n = len(c)

	g = 0
	h = 0
	i = 0

	memo = [[[0 for z in range(n)] for y in range(q)] for x in range(p)]
	memo[0][0][n-1] = 1

	for k in range(n-2, -1, -1):
		for i in range(p*n-1, -1, -1):
			for j in range(q*n-1, -1, -1):
				if a[i%p] == c[k]:
					memo[i%p][j%q][k] = memo[i%p][(j+1)%q][k+1]
				elif b[j%q] == c[k]:
					memo[i%p][j%q][k] = memo[(i+1)%p][j%q][k+1]
				elif a[i%p] == b[j%q]:
					if a[i%p] != c[k]:
						memo[i%p][j%q][k] = 0
					else:
						memo[i%p][j%q][k] = \
							max(memo[(i+1)%p][j%q][k+1], \
								memo[i%p][(j+1)%q][k+1])
		if k == 0:
			break

	return memo
				
