-- CreateIndex
CREATE UNIQUE INDEX "city_ibge_code_key" ON "city"("ibge_code");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhood_city_id_name_key" ON "neighborhood"("city_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "state_uf_key" ON "state"("uf");

