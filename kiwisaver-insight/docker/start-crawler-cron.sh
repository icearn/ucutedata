#!/bin/sh
set -eu

CRON_SCHEDULE="${CRON_SCHEDULE:-15 18 * * 1-5}"
TZ_VALUE="${TZ:-Pacific/Auckland}"
LOG_FILE="/var/log/kiwisaver-crawler.log"
ENV_FILE="/etc/profile.d/container_env.sh"
CRON_FILE="/etc/cron.d/kiwisaver-crawler"

mkdir -p /var/log
touch "$LOG_FILE"

if [ -f "/usr/share/zoneinfo/$TZ_VALUE" ]; then
  ln -snf "/usr/share/zoneinfo/$TZ_VALUE" /etc/localtime
  echo "$TZ_VALUE" > /etc/timezone
fi

printenv | sed "s/'/'\\\\''/g; s/^\([^=]*\)=\(.*\)$/export \1='\2'/" > "$ENV_FILE"
chmod 0644 "$ENV_FILE"

cat > "$CRON_FILE" <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
CRON_TZ=$TZ_VALUE
$CRON_SCHEDULE root . $ENV_FILE; cd /app && python -m kiwisaver_insight.scheduler >> $LOG_FILE 2>&1
EOF
chmod 0644 "$CRON_FILE"

echo "[crawler-cron] Timezone: $TZ_VALUE"
echo "[crawler-cron] Schedule: $CRON_SCHEDULE"
echo "[crawler-cron] Running initial incremental crawl..."

if ! /bin/sh -c ". $ENV_FILE; cd /app && python -m kiwisaver_insight.scheduler >> $LOG_FILE 2>&1"; then
  echo "[crawler-cron] Initial crawl failed; cron will keep retrying on schedule." | tee -a "$LOG_FILE"
fi

exec cron -f
