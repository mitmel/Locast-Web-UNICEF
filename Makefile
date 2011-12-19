../locast_tourism.tar.gz:
	tar --exclude Tourism/*.egg-info --exclude Tourism/build --exclude Tourism/.git* --exclude Tourism/dist --exclude \*\~ -C ../ -zcvf $@ Tourism
