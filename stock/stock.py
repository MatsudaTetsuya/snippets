import numpy as np
import pandas as pd
import pandas_datareader as pdr
import pystan

TEST_DATA_SIZE = 5

TODAY = pd.Timestamp('2017-05-15')

PRICE = 19810.0


def get_ordinal_of_weekday(timestamp):
    for i in range(5):
        offset = pd.tseries.offsets.Week(i + 1)
        if timestamp.month != (timestamp - offset).month:
            return i


def get_index_of_day(timestamp):
    w = timestamp.weekday()
    offset = pd.tseries.offsets.Day(4 - w)
    i = get_ordinal_of_weekday(timestamp + offset) * 5
    return(i + w + 1)


n225 = pdr.get_data_yahoo('^N225')

t = pd.DataFrame({'Return': np.log(n225['Close']) - np.log(n225['Open'])})

u = t[:len(t.index) - TEST_DATA_SIZE]

v = t[len(t.index) - TEST_DATA_SIZE:]

sm = pystan.StanModel(file='stock.stan')

data = {
    'N': len(u.index),
    'I': u.index.map(get_index_of_day),
    'Y': u['Return'],
    'M': len(v.index),
    'J': v.index.map(get_index_of_day),
    'Z': v['Return'],
    'K': get_index_of_day(TODAY)
}

fit = sm.sampling(data=data, seed=102)

samples = fit.extract()

omegas = np.fromiter(
    (np.percentile(samples['omega'][:, i], 50) for i in range(25)), np.float)
omegas = np.sqrt(omegas)
omegas = omegas * 100 / np.mean(omegas)
omegas = omegas.reshape([5, 5])
print('Omegas:')
for i in range(5):
    print(' '.join([f'{omega:6.2f}' for omega in omegas[i, :]]))

w = n225['Open'][len(n225.index) - TEST_DATA_SIZE:]
w[TODAY] = PRICE

taus = range(TEST_DATA_SIZE + 1)
taus = np.fromiter(
    (np.percentile(samples['tau'][:, i], 50) for i in taus), np.float)

print('')

print('Ranges:')
for t, p, s in zip(w.index, w, taus):
    head = p / np.exp(1.65 * s)
    tail = p * np.exp(1.65 * s)
    print(f'    ["{t:%Y-%m-%d}", [{head:8.2f}, {tail:8.2f}]],')


# url <- "http://api.fxhistoricaldata.com/v1/indicators"

# parameters <- list(
#     instruments = "USDJPY",
#     expression = "open",
#     item_count = "10000",
#     format = "csv",
#     timeframe = "hour")

# query <- paste(
#     url,
#     paste(
#         paste(names(parameters), parameters[names(parameters)], sep = "="),
#         collapse = "&"),
#     sep = "?")

# ## dx <- getSymbols(
# ##     "DXJ", src = "yahoo", from = format(Sys.Date() - 730, "%Y-%m-%d"))

# ## dx <- dx[, c(1, 4)]
# ## colnames(dx) <- c("Open", "Close")
