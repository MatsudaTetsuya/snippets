data {
    int<lower=2> N;
    int<lower=1,upper=25> I[N];
    real Y[N];
    int<lower=2> M;
    int<lower=1,upper=25> J[M];
    real Z[M];
    int<lower=1,upper=25> K;
}

parameters {
    real mu;
    real<lower=0> omega[25];
    real<lower=0,upper=1> alpha;
    real<lower=0,upper=1-alpha> beta;
}

transformed parameters {
    real<lower=0> sigma[N];
    sigma[1] = sd(Y);
    for (n in 2:N) {
        sigma[n] = sqrt(
            omega[I[n]] + alpha * square(Y[n - 1] - mu) + beta *
            square(sigma[n - 1]));
    }
}

model {
    Y ~ cauchy(mu, sigma);
}

generated quantities {
    real tau[M + 1];
    tau[1] = sqrt(
        omega[J[1]] + alpha * square(Y[N] - mu) + beta * square(sigma[N]));
    for (m in 2:M) {
        tau[m] = sqrt(
            omega[J[m]] + alpha * square(Z[m - 1] - mu) + beta *
            square(tau[m - 1]));
    }
    tau[M + 1] = sqrt(
        omega[K] + alpha * square(Z[M] - mu) + beta * square(tau[M]));
}
