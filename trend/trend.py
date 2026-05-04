import matplotlib.pyplot as plt
import numbers
import numpy as np
import pandas as pd
import pickle
import selenium.webdriver
import tensorflow as tf

USES_N225_CACHE = True


def normalize_percentage(series):
    return((series - 50) / 100)


def get_rsi(series, n=14):
    delta = series.diff()
    climb = delta.copy()
    lapse = delta.copy()
    climb[climb < 0] = 0
    lapse[lapse > 0] = 0
    lapse = lapse.abs()
    climb = climb.ewm(n).mean()
    lapse = lapse.ewm(n).mean()
    return(100.0 - (100.0 / (1.0 + climb / lapse)))


def get_fast_stochastic(series, fast_k=5, fast_d=3):
    k_min = series.rolling(fast_k).min()
    k_max = series.rolling(fast_k).max()
    k = 100 * (series - k_min) / (k_max - k_min)
    return(k.rolling(fast_d).mean())


def to_timestamp(timestamp):
    return(pd.Timestamp(timestamp * 1000 * 1000) + pd.tseries.offsets.Hour(9))


def get_n225_from_web(driver):
    driver.get('https://nikkei225jp.com/data/dollar.php')
    price = pd.Series(data=[], index=[], dtype=np.float32)
    volume = pd.Series(data=[], index=[], dtype=np.float32)
    offer = pd.Series(data=[], index=[], dtype=np.float32)
    bid = pd.Series(data=[], index=[], dtype=np.float32)
    touraku = pd.Series(data=[], index=[], dtype=np.float32)
    nkvi = pd.Series(data=[], index=[], dtype=np.float32)
    eps = pd.Series(data=[], index=[], dtype=np.float32)
    bps = pd.Series(data=[], index=[], dtype=np.float32)
    quote = pd.Series(data=[], index=[], dtype=np.float32)
    short = pd.Series(data=[], index=[], dtype=np.float32)
    for x in driver.execute_script('return DAILY'):
        t = to_timestamp(x[0])
        if isinstance(x[1], numbers.Number):
            price[t] = x[1]
        if isinstance(x[2], numbers.Number):
            volume[t] = x[2]
        if isinstance(x[3], numbers.Number):
            offer[t] = x[3]
        if isinstance(x[4], numbers.Number):
            bid[t] = x[4]
        if isinstance(x[7], numbers.Number):
            touraku[t] = x[7]
        if isinstance(x[11], numbers.Number):
            nkvi[t] = x[11]
        if isinstance(x[1], numbers.Number) and \
           isinstance(x[12], numbers.Number):
            eps[t] = x[1] / x[12]
        if isinstance(x[1], numbers.Number) and \
           isinstance(x[13], numbers.Number):
            bps[t] = x[1] / x[13]
        if isinstance(x[17], numbers.Number):
            quote[t] = x[17]
        if isinstance(x[22], numbers.Number) and \
           isinstance(x[24], numbers.Number):
            short[t] = x[22] + x[24]
    data = {
        'Price': price, 'Volume': volume, 'Offer': offer, 'Bid': bid,
        'Touraku': touraku, 'NKvi': nkvi, 'EPS': eps, 'BPS': bps,
        'Quote': quote, 'Short': short
    }
    columns = [
        'Price', 'Quote', 'EPS', 'BPS', 'Touraku', 'NKvi', 'Volume', 'Short',
        'Bid', 'Offer',
    ]
    return(pd.DataFrame(data, columns=columns))


def get_n225(driver, uses_cache=False):
    file_name = 'n225.pickle'
    if not uses_cache:
        value = get_n225_from_web(driver)
        with open(file_name, 'wb') as f:
            pickle.dump(value, f)
        return(value)
    else:
        with open('n225.pickle', mode='rb') as f:
            return(pickle.load(f))


np.random.seed(114514)

tf.set_random_seed(114514)

driver = selenium.webdriver.PhantomJS()

n225 = get_n225(driver, USES_N225_CACHE)

driver.quit()

print(n225.Quote.pct_change().dropna().std())

data = pd.DataFrame({
    't0000': n225.Price.pct_change().shift(-1),
    'x0000': n225.Price.pct_change(),
    'x0001': normalize_percentage(get_rsi(n225.Price)),
    'x0002': normalize_percentage(get_fast_stochastic(n225.Price)),
    'x0100': n225.Quote.pct_change(),
    'x0101': normalize_percentage(get_rsi(n225.Quote)),
    'x0102': normalize_percentage(get_fast_stochastic(n225.Quote)),
    'x0200': n225.EPS.pct_change(),
    'x0201': normalize_percentage(get_rsi(n225.EPS)),
    'x0202': normalize_percentage(get_fast_stochastic(n225.EPS)),
    'x0300': n225.BPS.pct_change(),
    'x0301': normalize_percentage(get_rsi(n225.BPS)),
    'x0302': normalize_percentage(get_fast_stochastic(n225.BPS)),
    'x0400': normalize_percentage(n225.Touraku),
    'x0500': n225.NKvi.pct_change(),
    'x0501': normalize_percentage(get_fast_stochastic(n225.NKvi)),
    'x0600': n225.Volume.pct_change(),
    'x0601': normalize_percentage(get_fast_stochastic(n225.Volume)),
    'x0700': n225.Short.pct_change(),
    'x0701': normalize_percentage(get_fast_stochastic(n225.Short)),
    'x0800': n225.Bid.pct_change(),
    'x0801': normalize_percentage(get_fast_stochastic(n225.Bid)),
    'x0900': n225.Offer.pct_change(),
    'x0901': normalize_percentage(get_fast_stochastic(n225.Offer)),
})

# data = data.dropna()

# data = data.reindex(np.random.permutation(data.index))

# x = tf.placeholder(tf.float32, [None, 23])

# unit_count2 = 4

# w2 = tf.Variable(tf.truncated_normal([23, unit_count2]))
# b2 = tf.Variable(tf.zeros([unit_count2]))
# hidden2 = tf.nn.relu(tf.matmul(x, w2) + b2)

# unit_count1 = 4

# w1 = tf.Variable(tf.truncated_normal([unit_count2, unit_count1]))
# b1 = tf.Variable(tf.zeros([unit_count1]))
# hidden1 = tf.nn.relu(tf.matmul(hidden2, w1) + b1)

# keep_prob = tf.placeholder(tf.float32)
# hidden1_drop = tf.nn.dropout(hidden1, keep_prob)

# w0 = tf.Variable(tf.truncated_normal([unit_count1, 1]))
# b0 = tf.Variable(tf.zeros([1]))
# f = tf.matmul(hidden1_drop, w0) + b0

# t = tf.placeholder(tf.float32, [None, 1])
# loss = tf.reduce_sum(tf.square(f - t))
# train_step = tf.train.AdamOptimizer().minimize(loss)

# fs = []
# scores = []
# for i in range(len(data.index)):
#     test_data = data.iloc[i]
#     feed_data = data.drop(data.index[i])
#     sess = tf.InteractiveSession()
#     sess.run(tf.global_variables_initializer())
#     for _ in range(1000):
#         batch_size = 10
#         batch_position = 0
#         while batch_position < len(feed_data.index):
#             batch = feed_data[batch_position:batch_position + batch_size]
#             batch_x = batch.iloc[:, 1:]
#             batch_t = batch.iloc[:, 0]
#             batch_t = batch_t.values.reshape([len(batch_t.index), 1])
#             sess.run(
#                 train_step, feed_dict={x: batch_x, t: batch_t, keep_prob: 0.5})
#             batch_position += batch_size
#     test_x = test_data[1:].values.reshape([1, 23])
#     test_t = test_data[0].reshape([1, 1])
#     rval = sess.run(
#         [f, loss], feed_dict={x: test_x, t: test_t, keep_prob: 1.0})
#     fs.append(rval[0][0, 0])
#     scores.append(rval[1])
#     if (i + 1) % 10 == 0:
#         print(f'{i / len(data.index) * 100:4.1f}')

# print(np.sqrt(np.array(scores).mean()))
