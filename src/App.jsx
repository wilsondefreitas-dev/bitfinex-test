import useWebSocket, { ReadyState } from "react-use-websocket";
import "./App.css";
import { useEffect } from "react";
import { useState } from "react";
import { useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { BASE_WS_URL } from "./utils/constants";
import { asc } from "./utils/functions";

//

const initialBookSnapshot = { bids: [], asks: [] };

function App() {
  const [connected, setConnected] = useState(false);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    BASE_WS_URL,
    { shouldReconnect: () => true },
    connected
  );
  const precision = useRef(0);
  const bookSnapshot = useRef(initialBookSnapshot);
  const chanId = useRef(null);
  const bookSnapshotIsReady =
    bookSnapshot?.current?.bids?.length > 0 &&
    bookSnapshot?.current?.asks?.length > 0;

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  //

  useEffect(() => {
    handleNewMessage(lastMessage);
  }, [lastMessage]);

  //

  function sendNewMessage() {
    sendMessage(
      JSON.stringify({
        event: "subscribe",
        channel: "book",
        symbol: "tBTCUSD",
        prec: `P${precision.current}`,
      })
    );
  }

  function switchConnection() {
    connected ? disconnect() : connect();
  }

  function connect() {
    setConnected(true);
    sendNewMessage();
  }

  function disconnect() {
    bookSnapshot.current = initialBookSnapshot;
    setConnected(false);
  }

  function setBookSnapshoot(book) {
    const newObj = { bids: [], asks: [] };

    book?.forEach((item) => {
      const amount = item[2];
      const isBid = amount > 0;

      isBid ? newObj.bids.push(item) : newObj.asks.push(item);
    });

    newObj.bids.sort((a, b) => {
      const price1 = a[0];
      const price2 = b[0];

      return asc(price1, price2);
    });

    newObj.asks
      .sort((a, b) => {
        const price1 = a[0];
        const price2 = b[0];

        return asc(price1, price2);
      })
      .reverse();

    bookSnapshot.current = newObj;
  }

  function handleUpdate(newUpdate) {
    let type = "";
    let data = [];
    const amount = newUpdate[2];
    const isBid = amount > 0;

    if (isBid) {
      type = "bids";
      data = [...bookSnapshot.current.bids].concat([newUpdate]);
      data.sort((a, b) => asc(a[0], b[0])).pop();
    } else {
      type = "asks";
      data = [...bookSnapshot.current.asks].concat([newUpdate]);
      data
        .sort((a, b) => asc(a[0], b[0]))
        .reverse()
        .pop();
    }

    bookSnapshot.current = { ...bookSnapshot.current, [type]: data };
  }

  function handleNewMessage(lastMessage) {
    if (!lastMessage?.data) return;

    const message = JSON.parse(lastMessage?.data);

    if (message?.chanId) chanId.current = message.chanId;

    if (message?.constructor !== Array && message[0] !== chanId.current) return;

    if (message[1] && message[1][0] && message[1][0].constructor === Array) {
      return setBookSnapshoot(message[1]);
    }

    if (
      message[1] &&
      message[1].constructor === Array &&
      message[1].length === 3
    ) {
      handleUpdate(message[1]);
    }
  }

  function changePrecision(value) {
    precision.current += value;

    disconnect();
    setInterval(() => {
      connect();
    }, 1);
  }

  //

  return (
    <div className="mainContainer">
      <div className="mainContainer__mainWrapper">
        <div className="mainContainer__toolBar">
          <span>BTN USC</span>
          <div>
            <button onClick={switchConnection}>
              {connected ? "Disconect" : "Connect"}
            </button>

            <button
              onClick={() => changePrecision(1)}
              disabled={!bookSnapshotIsReady || precision.current === 4}
            >
              {"precision .0 <"}
            </button>

            <button
              onClick={() => changePrecision(-1)}
              disabled={!bookSnapshotIsReady || precision.current === 0}
            >
              {"precision .00 >"}
            </button>
          </div>
        </div>

        <div className="mainContainer__content">
          {(connectionStatus === "Uninstantiated" ||
            connectionStatus === "Closed") && (
            <div className="mainContainer__info">Click on connect</div>
          )}
          {(connectionStatus === "Connecting" || connectionStatus === "Open") &&
            !bookSnapshotIsReady && (
              <div className="mainContainer__info">Loading...</div>
            )}

          {bookSnapshot.current.bids.length > 0 &&
            bookSnapshot.current.bids.length > 0 && (
              <div className="mainContainer__tablesContainer">
                <table className="mainContainer__bidsTable">
                  <tbody>
                    <tr>
                      <th>COUNT</th>
                      <th>AMOUNT</th>
                      <th>PRICE</th>
                    </tr>

                    {bookSnapshot?.current?.bids?.map((item) => {
                      const [PRICE, COUNT, AMOUNT] = item;
                      return (
                        <tr key={uuidv4()} style={{ color: "#26c426" }}>
                          <td>{COUNT}</td>
                          <td>{AMOUNT}</td>
                          <td>{PRICE}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <table className="mainContainer__asksTable">
                  <tbody>
                    <tr>
                      <th>PRICE</th>
                      <th>AMOUNT</th>
                      <th>COUNT</th>
                    </tr>

                    {bookSnapshot?.current?.asks?.map((item) => {
                      const [PRICE, COUNT, AMOUNT] = item;
                      return (
                        <tr key={uuidv4()} style={{ color: "#fb4141" }}>
                          <td>{PRICE}</td>
                          <td>{AMOUNT * -1}</td>
                          <td>{COUNT}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        <div className="mainContainer__status">
          Connection Status: {connectionStatus}
        </div>
      </div>
    </div>
  );
}

export default App;
