def rec_matrix_multiply(A, B, C, row_A, col_A, row_B, col_B, row_C, col_C, n):
    # basecase
    if n == 1: # if the length of the  matrix is 1 we can straight up multiply the values and add it to matrix C at the position
        C[row_C][col_C] += A[row_A][col_A] * B[row_B][col_B] 
        return
    
    new_n = n // 2

    # Fixed: changed all col_b to col_B and row_c/col_c to row_C/col_C
    # Top-left of C
    rec_matrix_multiply(A, B, C, row_A, col_A, row_B, col_B, row_C, col_C, new_n)
    rec_matrix_multiply(A, B, C, row_A, col_A + new_n, row_B + new_n, col_B, row_C, col_C, new_n)

    # Top-right of C
    rec_matrix_multiply(A, B, C, row_A, col_A, row_B, col_B + new_n, row_C, col_C + new_n, new_n)
    rec_matrix_multiply(A, B, C, row_A, col_A + new_n, row_B + new_n, col_B + new_n, row_C, col_C + new_n, new_n)

    # Bottom-left of C
    rec_matrix_multiply(A, B, C, row_A + new_n, col_A, row_B, col_B, row_C + new_n, col_C, new_n)
    rec_matrix_multiply(A, B, C, row_A + new_n, col_A + new_n, row_B + new_n, col_B, row_C + new_n, col_C, new_n)

    # Bottom-right of C
    rec_matrix_multiply(A, B, C, row_A + new_n, col_A, row_B, col_B + new_n, row_C + new_n, col_C + new_n, new_n)
    rec_matrix_multiply(A, B, C, row_A + new_n, col_A + new_n, row_B + new_n, col_B + new_n, row_C + new_n, col_C + new_n, new_n)

# Matrix A
A = [
    [5, 2, 6, 1],
    [0, 6, 2, 0],
    [3, 8, 1, 4],
    [1, 8, 5, 6]
]

# Matrix B
B = [
    [7, 5, 8, 0],
    [1, 8, 2, 6],
    [9, 4, 3, 8],
    [5, 3, 7, 9]
]

# Matrix C (Result)
C = [[0 for _ in range(4)] for _ in range(4)]

rec_matrix_multiply(A, B, C, 0, 0, 0, 0, 0, 0, len(A))

# Printing result for verification
for row in C:
    print(row)