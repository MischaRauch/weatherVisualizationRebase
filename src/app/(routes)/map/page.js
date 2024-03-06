"use client";

//import MapComponent from "@/components/MapComponent";
// Dynamically import the MapComponent with SSR disabled
import dynamic from "next/dynamic";
const MapComponentWithNoSSR = dynamic(
  () => import("@/components/MapComponent"),
  {
    ssr: false, // This line is key to making sure the import is client-side only
  }
);
import GraphComponent from "@/components/GraphComponent";
import {
  getProduction,
  getEnergyAfterIceLoss,
  getWindSpeed,
} from "@/utils/getFarmsProduction";
import TimeSliderComponent from "@/components/TimeSliderComponent";
import SimpleListOfFarmsComponent from "@/components/SimpleListOfFarmsComponent";
import "../../../output.css";
import { useState, useEffect } from "react";
import { getFarmsMeta } from "@/utils/getFarmsMetaData";
import EnergyProductionLegendComponent from "@/components/EnergyProductionLegendComponent";
import EnergyAfterIceLossLegendComponent from "@/components/EnergyAfterIceLossLegendComponent";
import SelectWeatherDisplayComponent from "@/components/SelectWeatherDisplayComponent";
import EnergyIceLossSwitchButton from "@/components/EnergyIceLossSwitchButton";
import ModelSelectComponent from "@/components/ModelSelectComponent";
import MapLegendComponent from "@/components/MapLegendComponent";
import humidityLegendData from "@/data/humidity_legend_data.json";
import temperatureLegendData from "@/data/temperature_legend_data.json";
import windspeedLegendData from "@/data/windspeed_legend_data.json";
import SearchComponent from "@/components/SearchComponent";

export default function Map() {
  const [energyData, setEnergyData] = useState(undefined);
  const [windData, setWindData] = useState(undefined);
  const [icelossData, setEnergyAfterIcelossData] = useState(undefined);
  const [selectedPlant, setSelectedPlant] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date("2021-11-25"));
  const [plantsArray, setPlants] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(undefined);
  const [selectedGraphs, setSelectedGraphs] = useState(["ws", "ice", "agg"]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentSwitchOption, setCurrentSwitchOption] =
    useState("Energy Production");
  const [selectedLayer, setSelectedLayer] = useState(["WindSpeed"]);
  const [aggregateData, setAggregateData] = useState(undefined);
  const [totalCapacity, setTotalCapacity] = useState(0);

  const graphTypes = ["agg", "ws", "hum", "temp", "ice"];

  const handleSwitchChange = (option) => {
    setCurrentSwitchOption(option);
  };

  const handleLayerChange = (newLayer) => {
    setSelectedLayer(newLayer);
  };
  const handleTimeChange = (newTime) => {
    setSelectedTime(newTime);
  };
  const handleDateChange = (newDate) => {
    const date = new Date(newDate);
    setSelectedDate(date);
  };

  const handlePlantSelect = (plant) => {
    setEnergyData(undefined);
    setWindData(undefined);
    setEnergyAfterIcelossData(undefined);
    setSelectedPlant(plant);
  };
  const handlePlantHover = (plant) => {
    setHoverInfo(plant);
  };
  const handleClickClose = () => {
    setSelectedPlant(undefined);
  };
  const handleGraphSelection = (graph) => {
    setSelectedGraphs((prevSelectedGraphs) => {
      if (prevSelectedGraphs.includes(graph)) {
        return prevSelectedGraphs.filter((g) => g !== graph);
      } else {
        return [...prevSelectedGraphs, graph];
      }
    });
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const [searchInput, setSearchInput] = useState("");
  const [filteredPlantsArray, setFilteredPlantsArray] = useState(plantsArray);

  const handleSearchInputChange = (searchValue) => {
    setSearchInput(searchValue);

    const filteredArray = plantsArray.filter((plant) =>
      plant.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    setFilteredPlantsArray(filteredArray);
  };

  useEffect(() => {
    async function fetchDataForSelectedPlant() {
      if (!selectedPlant || !selectedDate) return;

      const energy = await getProduction(
        selectedPlant.id,
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
      setEnergyData(energy);

      const energyAfterIceloss = await getEnergyAfterIceLoss(
        selectedPlant.id,
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
      setEnergyAfterIcelossData(energyAfterIceloss);

      const wind = await getWindSpeed(
        selectedPlant.id,
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
      setWindData(wind);
    }

    async function fetchAggregateData(plants) {
      if (!selectedDate || !plants) return;

      // Reset aggregateData when selectedDate or plants list changes
      let localAggregateData = new Array(24).fill(0);
      let capacitySum = 0;

      for (const plant of plants) {
        capacitySum += Number(plant.capacity_kw);
        const energyDataStr = await getProduction(
          plant.id,
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          selectedDate.getDate()
        );

        const energyData = energyDataStr.map(Number);
        localAggregateData = localAggregateData.map((sum, index) => {
          const currentEnergy = energyData[index] || 0;
          return sum + currentEnergy;
        });
      }

      setAggregateData(localAggregateData);
      setTotalCapacity(capacitySum);
    }

    async function fetchPlantsAndAggregateData() {
      const plants = await getFarmsMeta();
      setPlants(plants);

      // Now passing the freshly fetched plants directly to fetchAggregateData
      fetchAggregateData(plants);
    }

    // Fetch metadata for all plants and then fetch and aggregate data for all plants
    fetchPlantsAndAggregateData();

    // Fetch data for the selected plant
    fetchDataForSelectedPlant();
  }, [selectedPlant, selectedDate]);

  const [weatherData, setWeatherData] = useState([]);

  useEffect(() => {
    switch (selectedLayer[0]) {
      case "RelativeHumidity":
        setWeatherData(humidityLegendData);
        break;
      case "Temperature":
        setWeatherData(temperatureLegendData);
        break;
      case "WindSpeed":
        setWeatherData(windspeedLegendData);
        break;
      default:
        setWeatherData(windspeedLegendData);
    }
  }, [selectedLayer]);

  return (
    <div>
      <div className="ml-16 grid grid-col-2 vh-100">
        <div className="overflow-y map-col">
          {selectedPlant && (
            <div className="py-5">
              <div className="flex justify-between items-center w-full">
                <p>DETAIL VIEW</p>
                <button className="mr-4" onClick={handleClickClose}>
                  CLOSE
                </button>
              </div>

              <div className="flex justify-between items-center w-full">
                <h1 className="font-blue text-none">{selectedPlant.name}</h1>
                <div className="relative mr-4">
                  <button
                    onClick={toggleDropdown}
                    className="px-4 py-2 bg-gray-200"
                  >
                    Graph Types
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute mt-1 w-48 bg-dark shadow-md z-10 p-3">
                      {graphTypes.map((type) => (
                        <div key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            id={type}
                            checked={selectedGraphs.includes(type)}
                            onChange={() => handleGraphSelection(type)}
                            className="mr-2"
                          />
                          <label htmlFor={type}>{type.toUpperCase()}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {selectedGraphs.includes("agg") && (
                  <GraphComponent
                    GraphValues={aggregateData}
                    chartTitle="Aggregate Energy Output"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    maxCapacity={totalCapacity}
                    yAxisTitle="MW"
                  />
                )}
              </div>

              <div className="mb-8">
                {selectedGraphs.includes("energy") && (
                  <GraphComponent
                    graphValues={energyData}
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    maxCapacity={selectedPlant.capacity_kw}
                    yAxisTitle="MW"
                    lineColor="rgb(95, 190, 179)"
                    lineBackgroundColor="rgb(95, 190, 179, 0.35)"
                  />
                )}
              </div>
              <div>
                {selectedGraphs.includes("ice") && (
                  <GraphComponent
                    graphValues={icelossData}
                    chartTitle="Ice loss"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    yAxisTitle="%"
                    lineColor="rgb(255, 99, 132)"
                    lineBackgroundColor="rgb(255, 99, 132, 0.35)"
                  />
                )}
              </div>
              <div>
                {selectedGraphs.includes("ws") && (
                  <GraphComponent
                    graphValues={windData}
                    chartTitle="Windspeed"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    yAxisTitle="m/s"
                    lineColor="rgb(199, 218, 242)"
                    lineBackgroundColor="rgb(199, 218, 242, 0.35)"
                  />
                )}
              </div>
              <div>
                {selectedGraphs.includes("hum") && (
                  <GraphComponent
                    graphValues={windData}
                    chartTitle="Humidity"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    yAxisTitle="RH"
                    lineColor="rgb(199, 218, 242)"
                    lineBackgroundColor="rgb(199, 218, 242, 0.35)"
                  />
                )}
              </div>
              <div>
                {selectedGraphs.includes("temp") && (
                  <GraphComponent
                    graphValues={windData}
                    chartTitle="Temperature"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    yAxisTitle="°C"
                    lineColor="rgb(199, 218, 242)"
                    lineBackgroundColor="rgb(199, 218, 242, 0.35)"
                  />
                )}
              </div>
            </div>
          )}
          {!selectedPlant && (
            <div className="py-5">
              <p>LIST VIEW</p>
              <h1>All Farms</h1>
              <div>
                {selectedGraphs.includes("agg") && (
                  <GraphComponent
                    graphValues={aggregateData}
                    chartTitle="Aggregate Energy Output"
                    selectedTime={selectedTime}
                    selectedDate={selectedDate}
                    maxCapacity={totalCapacity}
                    yAxisTitle="MW"
                  />
                )}
              </div>
              <SearchComponent onSearchChange={handleSearchInputChange} />
              <SimpleListOfFarmsComponent
                plantsArray={searchInput ? filteredPlantsArray : plantsArray}
                hoverInfo={hoverInfo}
                onSelectPlant={handlePlantSelect}
                onHoverPlant={handlePlantHover}
              />
            </div>
          )}
        </div>

        <div className="w-full map-col relative">
          <div
            className="absolute top-0 right-0 z-50 mt-4 mr-4 p-4 flex flex-col items-end"
            style={{ padding: "0px" }}
          >
            <ModelSelectComponent />
            <SelectWeatherDisplayComponent onLayerChange={handleLayerChange} />
            <MapLegendComponent weatherData={weatherData}></MapLegendComponent>
          </div>
          <MapComponentWithNoSSR
            className="mr-2"
            onSelectPlant={handlePlantSelect}
            selectedPlant={selectedPlant}
            plantsArray={searchInput ? filteredPlantsArray : plantsArray}
            onHoverPlant={handlePlantHover}
            hoverInfo={hoverInfo}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            switchOption={currentSwitchOption}
            selectedLayer={selectedLayer}
          >
            <div className="flex flex-col items-end w-full">
              <div className="flex flex-col items-end">
                <EnergyIceLossSwitchButton
                  onSwitchChange={handleSwitchChange}
                />
                {currentSwitchOption === "Energy Production" ? (
                  <EnergyProductionLegendComponent />
                ) : (
                  <EnergyAfterIceLossLegendComponent />
                )}
              </div>
              <TimeSliderComponent
                onTimeChange={handleTimeChange}
                onDateChange={handleDateChange}
              />
            </div>
          </MapComponentWithNoSSR>
        </div>
      </div>
    </div>
  );
}
