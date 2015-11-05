def tears 

def weep(m,t):
	memo = [[float("inf") for j in range(len(t)+1)] for i in range(len(m)+1)]
	
	for day in range(len(m)+1):
		memo[day][len(t)] = max((m[i] - T[i] + t[j])**4, T[i] + t[j] - m[i])

	T = [0] * (len(m) + 1)

	for i in range(len(m)-2,-1,-1):
		for j in range(len(t)-2,-1,-1):
			print i,j
			value1 = memo[i][j+1] + \
				max((m[i] - T[i] + t[j])**4, T[i] + t[j] - m[i])
			value2 = memo[i+1][j+1] + \
				max((m[i+1] - T[i+1] + t[j])**4, T[i+1] + t[j] - m[i+1])

			if value1 < value2:
				T[i] += t[j]
				memo[i][j] = value1
			else:
				T[i+1] += t[j]
				memo[i][j] = value2

	return memo
