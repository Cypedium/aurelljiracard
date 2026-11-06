import { describe, expect, it, jest } from "@jest/globals";
import { BOARD_ACTIONS, onBoardAction, requestBoardAction } from "../../app/utils/boardActions";

describe("board actions", () => {
  it("calls only the listeners for the requested action", () => {
    const createCard = jest.fn();
    const createColumn = jest.fn();
    const stopCard = onBoardAction(BOARD_ACTIONS.createCard, createCard);
    const stopColumn = onBoardAction(BOARD_ACTIONS.createColumn, createColumn);

    requestBoardAction(BOARD_ACTIONS.createCard);

    expect(createCard).toHaveBeenCalledTimes(1);
    expect(createColumn).not.toHaveBeenCalled();
    stopCard();
    stopColumn();
  });

  it("stops calling a listener after unsubscribing", () => {
    const handler = jest.fn();
    const stop = onBoardAction(BOARD_ACTIONS.createColumn, handler);
    stop();

    requestBoardAction(BOARD_ACTIONS.createColumn);

    expect(handler).not.toHaveBeenCalled();
  });
});
